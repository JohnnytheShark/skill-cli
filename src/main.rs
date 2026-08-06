mod cli;
mod db;
mod mcp;
mod models;

use clap::Parser;
use serde::Deserialize;
use std::collections::HashSet;
use std::fmt::Write as FmtWrite;
use std::fs;
use std::path::{Path, PathBuf};

use crate::cli::{Cli, Commands};
use crate::models::Skill;

#[derive(Deserialize, Debug)]
struct Frontmatter {
    name: Option<String>,
    description: Option<String>,
}

fn main() {
    let cli = Cli::parse();

    let mut db_path = match dirs::config_dir() {
        Some(dir) => dir,
        None => PathBuf::from("."),
    };
    db_path.push("skills");

    if let Err(e) = fs::create_dir_all(&db_path) {
        eprintln!("Failed to create config directory: {}", e);
        std::process::exit(1);
    }

    db_path.push("skills.db");

    let pool = match db::init_pool(&db_path) {
        Ok(p) => p,
        Err(e) => {
            eprintln!("Failed to connect to database: {}", e);
            std::process::exit(1);
        }
    };

    if let Some(cmd) = cli.command {
        match cmd {
            Commands::Serve => {
                mcp::start_mcp_server(pool);
            }
            Commands::Sync { dir, prune } => {
                sync_skills(&pool, &dir, prune);
            }
            Commands::Search { query } => match db::skills_search(&pool, &query, 50) {
                Ok(skills) => {
                    for skill in skills {
                        println!("- {} ({}): {}", skill.id, skill.name, skill.description);
                    }
                }
                Err(e) => eprintln!("Search failed: {}", e),
            },
            Commands::List => match db::list_skills(&pool) {
                Ok(skills) => {
                    for skill in skills {
                        println!("- {} ({}): {}", skill.id, skill.name, skill.description);
                    }
                }
                Err(e) => eprintln!("List failed: {}", e),
            },
            Commands::Remove { id } => match db::skills_delete(&pool, &id) {
                Ok(true) => println!("Removed skill '{}'.", id),
                Ok(false) => eprintln!("Skill '{}' not found.", id),
                Err(e) => eprintln!("Failed to remove skill '{}': {}", id, e),
            },
            Commands::RemoveBulk { ids } => {
                let refs: Vec<&str> = ids.iter().map(String::as_str).collect();
                match db::skills_delete_bulk(&pool, &refs) {
                    Ok(n) => println!("Removed {} skill(s).", n),
                    Err(e) => eprintln!("Bulk remove failed: {}", e),
                }
            }
            Commands::Purge { yes } => {
                if !yes {
                    eprintln!(
                        "This will permanently delete ALL skills.\n\
                         Re-run with --yes to confirm: skill-cli purge --yes"
                    );
                    std::process::exit(1);
                }
                match db::skills_purge(&pool) {
                    Ok(n) => println!("Purged {} skill(s) from the database.", n),
                    Err(e) => eprintln!("Purge failed: {}", e),
                }
            }
            Commands::Export {
                dir,
                ids,
                query,
                limit,
            } => {
                export_skills(&pool, &dir, ids.as_deref(), query.as_deref(), limit);
            }
        }
    } else {
        mcp::start_mcp_server(pool);
    }
}

fn sync_skills(pool: &db::DbPool, dir: &str, prune: bool) {
    let path = Path::new(dir);
    if !path.exists() || !path.is_dir() {
        eprintln!("Error: '{}' does not exist or is not a directory.", dir);
        return;
    }

    // Resolve to a canonical absolute path to prevent path traversal via symlinks
    let canonical = match path.canonicalize() {
        Ok(p) => p,
        Err(e) => {
            eprintln!("Failed to resolve directory path: {}", e);
            return;
        }
    };

    // If pruning, snapshot the current DB IDs before we start
    let existing_ids: Option<HashSet<String>> = if prune {
        match db::all_skill_ids(pool) {
            Ok(ids) => Some(ids),
            Err(e) => {
                eprintln!("Failed to load existing skill IDs for prune: {}", e);
                return;
            }
        }
    } else {
        None
    };

    let entries = match fs::read_dir(&canonical) {
        Ok(e) => e,
        Err(e) => {
            eprintln!("Failed to read directory: {}", e);
            return;
        }
    };

    let mut imported = 0usize;
    let mut seen_ids: HashSet<String> = HashSet::new();

    for entry in entries.flatten() {
        let entry_path = entry.path();

        // Skip symlinks explicitly
        match entry_path.symlink_metadata() {
            Ok(meta) if meta.is_symlink() => {
                eprintln!("Skipping symlink: {}", entry_path.display());
                continue;
            }
            Err(e) => {
                eprintln!("Could not stat {}: {}", entry_path.display(), e);
                continue;
            }
            _ => {}
        }

        if !entry_path.is_file() || entry_path.extension().and_then(|s| s.to_str()) != Some("md") {
            continue;
        }

        let id = match entry_path.file_stem().and_then(|s| s.to_str()) {
            Some(stem) if !stem.is_empty() => stem.to_string(),
            _ => continue,
        };

        if !db::id_is_safe(&id) {
            eprintln!(
                "Skipping '{}': stem '{}' contains characters not allowed in a skill ID \
                 (use alphanumeric, hyphens, underscores only).",
                entry_path.display(),
                id
            );
            continue;
        }

        if entry_path
            .metadata()
            .is_ok_and(|m| m.len() > db::MAX_FIELD_BYTES as u64)
        {
            eprintln!(
                "Skipping '{}': file size exceeds the 1 MiB limit.",
                entry_path.display()
            );
            continue;
        }

        match fs::read_to_string(&entry_path) {
            Ok(content) => {
                if let Some(skill) = parse_skill_markdown(&id, &content) {
                    match db::skills_upsert(pool, &skill) {
                        Ok(_) => {
                            println!("Imported skill: {}", id);
                            imported += 1;
                            seen_ids.insert(id);
                        }
                        Err(e) => eprintln!("Failed to upsert skill '{}': {}", id, e),
                    }
                }
            }
            Err(e) => eprintln!("Failed to read '{}': {}", entry_path.display(), e),
        }
    }

    println!("Successfully synced {} skill(s).", imported);

    // Prune: remove any DB skill whose ID was not in the directory
    if let Some(before_ids) = existing_ids {
        let stale: Vec<&str> = before_ids
            .iter()
            .filter(|id| !seen_ids.contains(*id))
            .map(String::as_str)
            .collect();

        if stale.is_empty() {
            println!("No stale skills to prune.");
        } else {
            match db::skills_delete_bulk(pool, &stale) {
                Ok(n) => println!("Pruned {} stale skill(s): {:?}", n, stale),
                Err(e) => eprintln!("Prune failed: {}", e),
            }
        }
    }
}

fn parse_skill_markdown(id: &str, content: &str) -> Option<Skill> {
    if content.starts_with("---") {
        let parts: Vec<&str> = content.splitn(3, "---").collect();
        if parts.len() == 3 {
            let frontmatter_str = parts[1];
            let body = parts[2].trim();
            if let Ok(fm) = serde_yml::from_str::<Frontmatter>(frontmatter_str) {
                return Some(Skill {
                    id: id.to_string(),
                    name: fm.name.unwrap_or_else(|| id.to_string()),
                    description: fm.description.unwrap_or_default(),
                    content: body.to_string(),
                });
            }
        }
    }

    Some(Skill {
        id: id.to_string(),
        name: id.to_string(),
        description: String::new(),
        content: content.to_string(),
    })
}

/// Render a Skill back to a sync-compatible Markdown string with YAML frontmatter.
fn skill_to_markdown(skill: &Skill) -> String {
    let mut out = String::new();
    let _ = writeln!(out, "---");
    let _ = writeln!(out, "name: \"{}\"", skill.name.replace('"', "\\\""));
    let _ = writeln!(
        out,
        "description: \"{}\"",
        skill.description.replace('"', "\\\"")
    );
    let _ = writeln!(out, "---");
    let _ = writeln!(out);
    out.push_str(&skill.content);
    if !skill.content.ends_with('\n') {
        out.push('\n');
    }
    out
}

fn export_skills(
    pool: &db::DbPool,
    dir: &str,
    ids: Option<&[String]>,
    query: Option<&str>,
    limit: u32,
) {
    // Create output directory if it doesn't exist
    let out_path = Path::new(dir);
    if let Err(e) = fs::create_dir_all(out_path) {
        eprintln!("Failed to create output directory '{}': {}", dir, e);
        return;
    }

    // Fetch the skills to export
    let skills: Vec<Skill> = match (ids, query) {
        // Selective export by explicit IDs
        (Some(id_list), _) => {
            let refs: Vec<&str> = id_list.iter().map(String::as_str).collect();
            match db::skills_fetch_by_ids(pool, &refs) {
                Ok(s) => s,
                Err(e) => {
                    eprintln!("Failed to fetch skills: {}", e);
                    return;
                }
            }
        }
        // Filtered export by FTS query
        (None, Some(q)) => match db::skills_search_full(pool, q, limit) {
            Ok(s) => s,
            Err(e) => {
                eprintln!("Failed to search skills: {}", e);
                return;
            }
        },
        // Full export (no filter)
        (None, None) => match db::skills_fetch_all(pool) {
            Ok(s) => s,
            Err(e) => {
                eprintln!("Failed to fetch all skills: {}", e);
                return;
            }
        },
    };

    if skills.is_empty() {
        println!("No skills matched — nothing exported.");
        return;
    }

    let mut exported = 0usize;
    for skill in &skills {
        let filename = format!("{}.md", skill.id);
        let file_path = out_path.join(&filename);
        let markdown = skill_to_markdown(skill);
        match fs::write(&file_path, markdown) {
            Ok(_) => {
                println!("Exported: {}", filename);
                exported += 1;
            }
            Err(e) => eprintln!("Failed to write '{}': {}", file_path.display(), e),
        }
    }

    println!("\nExported {} skill(s) to '{}'.", exported, dir);
    println!("Share the directory and import with:  skill-cli sync --dir <path>");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_skill_markdown_with_frontmatter() {
        let raw = r#"---
name: Git Interactive Rebase
description: Step by step guide to squash commits
---

# Rebase Instructions
Run git rebase -i HEAD~3
"#;
        let skill = parse_skill_markdown("git-rebase", raw).unwrap();
        assert_eq!(skill.id, "git-rebase");
        assert_eq!(skill.name, "Git Interactive Rebase");
        assert_eq!(skill.description, "Step by step guide to squash commits");
        assert_eq!(
            skill.content,
            "# Rebase Instructions\nRun git rebase -i HEAD~3"
        );
    }

    #[test]
    fn test_parse_skill_markdown_without_frontmatter() {
        let raw = "# Just Markdown\nNo frontmatter here.";
        let skill = parse_skill_markdown("raw-skill", raw).unwrap();
        assert_eq!(skill.id, "raw-skill");
        assert_eq!(skill.name, "raw-skill");
        assert_eq!(skill.description, "");
        assert_eq!(skill.content, raw);
    }

    #[test]
    fn test_skill_markdown_roundtrip() {
        let original = Skill {
            id: "cargo-audit".to_string(),
            name: "Cargo \"Audit\" Tool".to_string(),
            description: "Scans dependencies for security advisories".to_string(),
            content: "# Audit\nRun `cargo audit` in terminal.\n".to_string(),
        };

        let rendered = skill_to_markdown(&original);
        assert!(rendered.starts_with("---\n"));
        let parsed = parse_skill_markdown(&original.id, &rendered).unwrap();
        assert_eq!(parsed.id, original.id);
        assert_eq!(parsed.name, original.name);
        assert_eq!(parsed.description, original.description);
        assert_eq!(parsed.content.trim(), original.content.trim());
    }
}
