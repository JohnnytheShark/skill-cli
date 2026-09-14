use reqwest::blocking::Client;
use serde_json::Value;

pub fn check_for_upgrade() {
    let current_version = env!("CARGO_PKG_VERSION");
    let url = "https://api.github.com/repos/JohnnytheShark/skill-cli/releases/latest";

    println!("Checking for updates...");

    let client = match Client::builder()
        .user_agent(concat!("skill-cli/", env!("CARGO_PKG_VERSION")))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Failed to build HTTP client: {}", e);
            return;
        }
    };

    match client.get(url).send() {
        Ok(response) => {
            if response.status().is_success() {
                match response.json::<Value>() {
                    Ok(json) => {
                        if let Some(tag_name) = json.get("tag_name").and_then(|v| v.as_str()) {
                            let latest_version = tag_name.trim_start_matches('v');
                            if latest_version != current_version {
                                println!(
                                    "A new version of skill-cli is available! {} -> {}",
                                    current_version, latest_version
                                );
                                if let Some(html_url) =
                                    json.get("html_url").and_then(|v| v.as_str())
                                {
                                    println!("Release notes: {}", html_url);
                                }
                                println!("\nTo upgrade, run the install script for your platform:");
                                #[cfg(windows)]
                                println!("  irm https://raw.githubusercontent.com/JohnnytheShark/skill-cli/main/install.ps1 | iex");
                                #[cfg(not(windows))]
                                println!("  curl -fsSL https://raw.githubusercontent.com/JohnnytheShark/skill-cli/main/install.sh | bash");
                                println!("\nNote: Make sure any running instances of skill-cli (like `skill-cli serve`) are stopped before upgrading.");
                            } else {
                                println!(
                                    "You are running the latest version of skill-cli ({}).",
                                    current_version
                                );
                            }
                        } else {
                            eprintln!("Failed to parse tag_name from GitHub API response.");
                        }
                    }
                    Err(e) => {
                        eprintln!("Failed to parse GitHub API JSON response: {}", e);
                    }
                }
            } else {
                eprintln!(
                    "Failed to check for upgrades. GitHub API returned status: {}",
                    response.status()
                );
            }
        }
        Err(e) => {
            eprintln!("Failed to check for upgrades. Network error: {}", e);
        }
    }
}
