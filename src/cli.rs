use clap::{Parser, Subcommand};

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Option<Commands>,
}

#[derive(Subcommand, Debug)]
pub enum Commands {
    /// Runs the MCP JSON-RPC loop over stdio
    Serve,

    /// Scans a folder of .md skill files and upserts them into SQLite.
    /// Use --prune to also remove skills no longer present in the directory.
    Sync {
        #[arg(short, long)]
        dir: String,
        /// Remove skills from the database whose .md file no longer exists in `<dir>`
        #[arg(long, default_value_t = false)]
        prune: bool,
    },

    /// Full-text search the skill index
    Search { query: String },

    /// Lists all indexed skill IDs and descriptions
    List,

    /// Remove a single skill by ID
    Remove {
        /// The skill ID to delete
        id: String,
    },

    /// Remove a list of skills by ID (space-separated)
    RemoveBulk {
        /// One or more skill IDs to delete
        #[arg(required = true)]
        ids: Vec<String>,
    },

    /// Delete ALL skills from the database. Requires --yes to confirm.
    Purge {
        /// Confirm that you want to delete every skill in the database
        #[arg(long)]
        yes: bool,
    },

    /// Export skills as .md files (sync-compatible) into a directory.
    ///
    /// By default exports ALL skills. Use --ids or --query to filter.
    Export {
        /// Output directory (created if it does not exist)
        #[arg(short, long)]
        dir: String,

        /// Export only these specific skill IDs (space-separated)
        #[arg(long, conflicts_with = "query")]
        ids: Option<Vec<String>>,

        /// Export only skills matching this FTS search query
        #[arg(long, conflicts_with = "ids")]
        query: Option<String>,

        /// Maximum results when using --query (default: 200)
        #[arg(long, default_value_t = 200)]
        limit: u32,
    },
}
