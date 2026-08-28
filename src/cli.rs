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
        /// Remove items from the database whose .md file no longer exists in `<dir>`
        #[arg(long, default_value_t = false)]
        prune: bool,
        /// The type of item to sync (skill or agent)
        #[arg(short = 't', long = "type", default_value = "skill")]
        item_type: crate::models::ItemType,
    },

    /// Full-text search the index
    Search {
        query: String,
        /// Optional collection to filter by
        #[arg(short, long)]
        collection: Option<String>,
        /// The type of item to search (skill, agent, or collection)
        #[arg(short = 't', long = "type", default_value = "skill")]
        item_type: crate::models::ItemType,
    },

    /// Lists all indexed IDs and descriptions
    List {
        /// The type of item to list (skill, agent, or collection)
        #[arg(short = 't', long = "type", default_value = "skill")]
        item_type: crate::models::ItemType,
    },

    /// Remove a single item by ID
    Remove {
        /// The ID to delete
        id: String,
        /// The type of item to remove (skill, agent, or collection)
        #[arg(short = 't', long = "type", default_value = "skill")]
        item_type: crate::models::ItemType,
    },

    /// Remove a list of items by ID (space-separated)
    RemoveBulk {
        /// One or more IDs to delete
        #[arg(required = true)]
        ids: Vec<String>,
        /// The type of item to remove (skill, agent, or collection)
        #[arg(short = 't', long = "type", default_value = "skill")]
        item_type: crate::models::ItemType,
    },

    /// Delete ALL items of a given type from the database. Requires --yes to confirm.
    Purge {
        /// Confirm that you want to delete every item
        #[arg(long)]
        yes: bool,
        /// The type of item to purge (skill, agent, or collection)
        #[arg(short = 't', long = "type", default_value = "skill")]
        item_type: crate::models::ItemType,
    },

    /// Export items as .md files (sync-compatible) into a directory.
    ///
    /// By default exports ALL items. Use --ids or --query to filter.
    Export {
        /// Output directory (created if it does not exist)
        #[arg(short, long)]
        dir: String,

        /// Export only these specific IDs (space-separated)
        #[arg(long, conflicts_with = "query")]
        ids: Option<Vec<String>>,

        /// Export only items matching this FTS search query
        #[arg(long, conflicts_with = "ids")]
        query: Option<String>,

        /// Optional collection to filter by
        #[arg(short, long)]
        collection: Option<String>,

        /// Maximum results when using --query (default: 200)
        #[arg(long, default_value_t = 200)]
        limit: u32,

        /// The type of item to export (skill, agent, or collection)
        #[arg(short = 't', long = "type", default_value = "skill")]
        item_type: crate::models::ItemType,
    },

    /// View usage metrics
    Metrics,
}
