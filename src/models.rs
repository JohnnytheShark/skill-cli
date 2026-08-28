use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Item {
    pub id: String,
    pub name: String,
    pub description: String,
    pub content: String,
    #[serde(default)]
    pub collections: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemMetadata {
    pub id: String,
    pub name: String,
    pub description: String,
    #[serde(default)]
    pub collections: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, clap::ValueEnum)]
#[serde(rename_all = "lowercase")]
pub enum ItemType {
    Skill,
    Agent,
    Collection,
}

impl std::fmt::Display for ItemType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ItemType::Skill => write!(f, "skill"),
            ItemType::Agent => write!(f, "agent"),
            ItemType::Collection => write!(f, "collection"),
        }
    }
}
