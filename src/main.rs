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
use crate::models::{Item, ItemType};

#[derive(Deserialize, Debug)]
struct Frontmatter {
    name: Option<String>,
    description: Option<String>,
    collections: Option<Vec<String>>,
    tags: Option<Vec<String>>,
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
            Commands::Sync {
                dir,
                prune,
                item_type,
            } => {
                sync_items(&pool, &dir, item_type, prune);
            }
            Commands::Search { query, collection, item_type } => {
                let col_filter = collection.as_deref();
                match db::item_search(&pool, &query, item_type.clone(), col_filter, 50) {
                    Ok(items) => {
                        for item in items {
                            println!("- {} ({}): {}", item.id, item.name, item.description);
                        }
                    }
                    Err(e) => eprintln!("Search failed: {}", e),
                }
            }
            Commands::List { item_type } => match db::list_items(&pool, item_type.clone()) {
                Ok(items) => {
                    for item in items {
                        println!("- {} ({}): {}", item.id, item.name, item.description);
                    }
                }
                Err(e) => eprintln!("List failed: {}", e),
            },
            Commands::Remove { id, item_type } => {
                match db::item_delete(&pool, &id, item_type.clone()) {
                    Ok(true) => println!("Removed {} '{}'.", item_type, id),
                    Ok(false) => eprintln!("{} '{}' not found.", item_type, id),
                    Err(e) => eprintln!("Failed to remove {} '{}': {}", item_type, id, e),
                }
            }
            Commands::RemoveBulk { ids, item_type } => {
                let refs: Vec<&str> = ids.iter().map(String::as_str).collect();
                match db::item_delete_bulk(&pool, &refs, item_type.clone()) {
                    Ok(n) => println!("Removed {} {}(s).", n, item_type),
                    Err(e) => eprintln!("Bulk remove failed: {}", e),
                }
            }
            Commands::Purge { yes, item_type } => {
                if !yes {
                    eprintln!(
                        "This will permanently delete ALL {}s.\n\
                         Re-run with --yes to confirm.",
                        item_type
                    );
                    std::process::exit(1);
                }
                match db::item_purge(&pool, item_type.clone()) {
                    Ok(n) => println!("Purged {} {}(s) from the database.", n, item_type),
                    Err(e) => eprintln!("Purge failed: {}", e),
                }
            }
            Commands::Export {
                dir,
                ids,
                query,
                collection,
                limit,
                item_type,
            } => {
                export_items(
                    &pool,
                    &dir,
                    ids.as_deref(),
                    query.as_deref(),
                    collection.as_deref(),
                    limit,
                    item_type,
                );
            }
            Commands::Metrics => {
                println!(
                    "Metrics tracking is active. Run direct sqlite queries on usage_logs to view time-series analysis."
                );
            }
        }
    } else {
        mcp::start_mcp_server(pool);
    }
}

fn sync_items(pool: &db::DbPool, dir: &str, item_type: ItemType, prune: bool) {
    let path = Path::new(dir);
    if !path.exists() || !path.is_dir() {
        eprintln!("Error: '{}' does not exist or is not a directory.", dir);
        return;
    }

    let canonical = match path.canonicalize() {
        Ok(p) => p,
        Err(e) => {
            eprintln!("Failed to resolve directory path: {}", e);
            return;
        }
    };

    let existing_ids: Option<HashSet<String>> = if prune {
        match db::all_item_ids(pool, item_type.clone()) {
            Ok(ids) => Some(ids),
            Err(e) => {
                eprintln!("Failed to load existing {} IDs for prune: {}", item_type, e);
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
                "Skipping '{}': stem '{}' contains invalid characters.",
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
                "Skipping '{}': file size exceeds limit.",
                entry_path.display()
            );
            continue;
        }

        match fs::read_to_string(&entry_path) {
            Ok(content) => {
                if let Some(item) = parse_item_markdown(&id, &content) {
                    match db::item_upsert(pool, &item, item_type.clone()) {
                        Ok(_) => {
                            println!("Imported {}: {}", item_type, id);
                            imported += 1;
                            seen_ids.insert(id);
                        }
                        Err(e) => eprintln!("Failed to upsert {} '{}': {}", item_type, id, e),
                    }
                }
            }
            Err(e) => eprintln!("Failed to read '{}': {}", entry_path.display(), e),
        }
    }

    println!("Successfully synced {} {}(s).", imported, item_type);

    if let Some(before_ids) = existing_ids {
        let stale: Vec<&str> = before_ids
            .iter()
            .filter(|id| !seen_ids.contains(*id))
            .map(String::as_str)
            .collect();

        if stale.is_empty() {
            println!("No stale {}s to prune.", item_type);
        } else {
            match db::item_delete_bulk(pool, &stale, item_type.clone()) {
                Ok(n) => println!("Pruned {} stale {}(s): {:?}", n, item_type, stale),
                Err(e) => eprintln!("Prune failed: {}", e),
            }
        }
    }
}

fn parse_item_markdown(id: &str, content: &str) -> Option<Item> {
    if content.starts_with("---") {
        let parts: Vec<&str> = content.splitn(3, "---").collect();
        if parts.len() == 3 {
            let frontmatter_str = parts[1];
            let body = parts[2].trim();
            if let Ok(fm) = serde_yml::from_str::<Frontmatter>(frontmatter_str) {
                let mut collections = fm.collections.unwrap_or_default();
                if let Some(tags) = fm.tags {
                    collections.extend(tags);
                }
                collections.sort();
                collections.dedup();
                return Some(Item {
                    id: id.to_string(),
                    name: fm.name.unwrap_or_else(|| id.to_string()),
                    description: fm.description.unwrap_or_default(),
                    content: body.to_string(),
                    collections,
                });
            }
        }
    }

    Some(Item {
        id: id.to_string(),
        name: id.to_string(),
        description: String::new(),
        content: content.to_string(),
        collections: vec![],
    })
}

fn item_to_markdown(item: &Item) -> String {
    let mut out = String::new();
    let _ = writeln!(out, "---");
    let _ = writeln!(out, "name: \"{}\"", item.name.replace('"', "\\\""));
    let _ = writeln!(
        out,
        "description: \"{}\"",
        item.description.replace('"', "\\\"")
    );
    if !item.collections.is_empty() {
        let _ = writeln!(out, "collections:");
        for col in &item.collections {
            let _ = writeln!(out, "  - \"{}\"", col.replace('"', "\\\""));
        }
    }
    let _ = writeln!(out, "---");
    let _ = writeln!(out);
    out.push_str(&item.content);
    if !item.content.ends_with('\n') {
        out.push('\n');
    }
    out
}

fn export_items(
    pool: &db::DbPool,
    dir: &str,
    ids: Option<&[String]>,
    query: Option<&str>,
    collection: Option<&str>,
    limit: u32,
    item_type: ItemType,
) {
    let out_path = Path::new(dir);
    if let Err(e) = fs::create_dir_all(out_path) {
        eprintln!("Failed to create output directory '{}': {}", dir, e);
        return;
    }

    let items: Vec<Item> = match (ids, query, collection) {
        (Some(id_list), _, _) => {
            let refs: Vec<&str> = id_list.iter().map(String::as_str).collect();
            match db::item_fetch_by_ids(pool, &refs, item_type.clone()) {
                Ok(s) => s,
                Err(e) => {
                    eprintln!("Failed to fetch {}s: {}", item_type, e);
                    return;
                }
            }
        }
        (None, Some(_), _) | (None, None, Some(_)) => {
            let query_str = query.unwrap_or("");
            match db::item_search_full(pool, query_str, item_type.clone(), collection, limit) {
                Ok(s) => s,
                Err(e) => {
                    eprintln!("Failed to search {}s: {}", item_type, e);
                    return;
                }
            }
        },
        (None, None, None) => match db::item_fetch_all(pool, item_type.clone()) {
            Ok(s) => s,
            Err(e) => {
                eprintln!("Failed to fetch all {}s: {}", item_type, e);
                return;
            }
        },
    };

    if items.is_empty() {
        println!("No {}s matched — nothing exported.", item_type);
        return;
    }

    let mut exported = 0usize;
    for item in &items {
        let filename = format!("{}.md", item.id);
        let file_path = out_path.join(&filename);
        let markdown = item_to_markdown(item);
        match fs::write(&file_path, markdown) {
            Ok(_) => {
                println!("Exported: {}", filename);
                exported += 1;
            }
            Err(e) => eprintln!("Failed to write '{}': {}", file_path.display(), e),
        }
    }

    println!("\nExported {} {}(s) to '{}'.", exported, item_type, dir);
    println!(
        "Share the directory and import with:  skill-cli sync --type {} --dir <path>",
        item_type
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_item_markdown_with_frontmatter() {
        let raw = r#"---
name: Git Interactive Rebase
description: Step by step guide to squash commits
---

# Rebase Instructions
Run git rebase -i HEAD~3
"#;
        let item = parse_item_markdown("git-rebase", raw).unwrap();
        assert_eq!(item.id, "git-rebase");
        assert_eq!(item.name, "Git Interactive Rebase");
        assert_eq!(item.description, "Step by step guide to squash commits");
        assert_eq!(
            item.content,
            "# Rebase Instructions\nRun git rebase -i HEAD~3"
        );
    }

    #[test]
    fn test_parse_item_markdown_without_frontmatter() {
        let raw = "# Just Markdown\nNo frontmatter here.";
        let item = parse_item_markdown("raw-item", raw).unwrap();
        assert_eq!(item.id, "raw-item");
        assert_eq!(item.name, "raw-item");
        assert_eq!(item.description, "");
        assert_eq!(item.content, raw);
    }

    #[test]
    fn test_item_markdown_roundtrip() {
        let original = Item {
            id: "cargo-audit".to_string(),
            name: "Cargo \"Audit\" Tool".to_string(),
            description: "Scans dependencies for security advisories".to_string(),
            content: "# Audit\nRun `cargo audit` in terminal.\n".to_string(),
            collections: vec![],
        };

        let rendered = item_to_markdown(&original);
        assert!(rendered.starts_with("---\n"));
        let parsed = parse_item_markdown(&original.id, &rendered).unwrap();
        assert_eq!(parsed.id, original.id);
        assert_eq!(parsed.name, original.name);
        assert_eq!(parsed.description, original.description);
        assert_eq!(parsed.content.trim(), original.content.trim());
    }
}
