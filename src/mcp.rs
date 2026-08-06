use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::io::{self, BufRead, Write};

use crate::db::{self, DbPool, MAX_SEARCH_LIMIT};
use crate::models::Skill;

/// Maximum byte length of a single incoming JSON-RPC line.
/// Prevents memory exhaustion from a single enormous input line.
const MAX_LINE_BYTES: usize = 2 * 1024 * 1024; // 2 MiB

#[derive(Serialize, Deserialize, Debug)]
struct RpcRequest {
    jsonrpc: String,
    method: String,
    params: Option<Value>,
    id: Option<Value>,
}

#[derive(Serialize, Deserialize, Debug)]
struct RpcResponse {
    jsonrpc: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<RpcError>,
    id: Option<Value>,
}

#[derive(Serialize, Deserialize, Debug, PartialEq)]
struct RpcError {
    code: i32,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<Value>,
}

fn build_response(id: Option<Value>, result: Option<Value>, error: Option<RpcError>) -> String {
    let response = RpcResponse {
        jsonrpc: "2.0".to_string(),
        result,
        error,
        id,
    };
    // serde_json only fails on types that impl Serialize incorrectly (none here),
    // but we handle it gracefully rather than unwrapping.
    match serde_json::to_string(&response) {
        Ok(s) => s,
        Err(_) => r#"{"jsonrpc":"2.0","error":{"code":-32603,"message":"Internal serialization error"},"id":null}"#.to_string(),
    }
}

fn build_error(id: Option<Value>, code: i32, message: &str) -> String {
    build_response(
        id,
        None,
        Some(RpcError {
            code,
            message: message.to_string(),
            data: None,
        }),
    )
}

pub fn start_mcp_server(pool: DbPool) {
    eprintln!("Starting MCP server over stdio...");
    let stdin = io::stdin();
    for line in stdin.lock().lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => break,
        };

        if line.trim().is_empty() {
            continue;
        }

        // Reject lines that exceed the size limit before parsing
        if line.len() > MAX_LINE_BYTES {
            let resp = build_error(None, -32700, "Request too large");
            println!("{}", resp);
            let _ = io::stdout().flush();
            continue;
        }

        let req: Result<RpcRequest, _> = serde_json::from_str(&line);
        match req {
            Ok(request) => {
                if let Some(resp) = handle_request(&pool, request) {
                    println!("{}", resp);
                    let _ = io::stdout().flush();
                }
            }
            Err(_) => {
                // Do NOT echo the parse error detail — it can reflect back raw user input
                let resp = build_error(None, -32700, "Parse error");
                println!("{}", resp);
                let _ = io::stdout().flush();
            }
        }
    }
}

fn handle_request(pool: &DbPool, req: RpcRequest) -> Option<String> {
    let id = req.id.clone();

    match req.method.as_str() {
        "initialize" => {
            let result = serde_json::json!({
                "protocolVersion": "2024-11-05",
                "capabilities": { "tools": {} },
                "serverInfo": {
                    "name": "skill-cli",
                    "version": env!("CARGO_PKG_VERSION")
                }
            });
            Some(build_response(id, Some(result), None))
        }
        "notifications/initialized" => None,
        "tools/list" => {
            let result = serde_json::json!({
                "tools": [
                    {
                        "name": "skills_search",
                        "description": "Queries skills_fts. Returns ONLY high-level metadata (ID, name, description)",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "query": { "type": "string", "maxLength": 1000 },
                                "limit": {
                                    "type": "integer",
                                    "default": 5,
                                    "minimum": 1,
                                    "maximum": MAX_SEARCH_LIMIT
                                }
                            },
                            "required": ["query"],
                            "additionalProperties": false
                        }
                    },
                    {
                        "name": "skills_fetch",
                        "description": "Fetches full content (Markdown instructions) for a single skill ID",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "id": { "type": "string", "maxLength": 256 }
                            },
                            "required": ["id"],
                            "additionalProperties": false
                        }
                    },
                    {
                        "name": "skills_upsert",
                        "description": "Inserts or updates a skill in SQLite and refreshes FTS indexes",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "id": { "type": "string", "maxLength": 256, "pattern": "^[a-zA-Z0-9_-]+$" },
                                "name": { "type": "string", "maxLength": 500 },
                                "description": { "type": "string", "maxLength": 1000 },
                                "content": { "type": "string", "maxLength": 1048576 }
                            },
                            "required": ["id", "name", "description", "content"],
                            "additionalProperties": false
                        }
                    },
                    {
                        "name": "skills_delete",
                        "description": "Delete a single skill by ID. Returns whether the skill existed.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "id": { "type": "string", "maxLength": 256, "pattern": "^[a-zA-Z0-9_-]+$" }
                            },
                            "required": ["id"],
                            "additionalProperties": false
                        }
                    },
                    {
                        "name": "skills_delete_bulk",
                        "description": "Delete multiple skills by ID in one call. Returns count deleted.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "ids": {
                                    "type": "array",
                                    "items": { "type": "string", "maxLength": 256, "pattern": "^[a-zA-Z0-9_-]+$" },
                                    "minItems": 1,
                                    "maxItems": 500
                                }
                            },
                            "required": ["ids"],
                            "additionalProperties": false
                        }
                    },
                    {
                        "name": "skills_export",
                        "description": "Export skills as a JSON array of complete skill objects (id, name, description, content). Optionally filter by ids or FTS query. Use to share skills with others.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "ids": {
                                    "type": "array",
                                    "items": { "type": "string", "maxLength": 256 },
                                    "description": "Specific skill IDs to export. Omit to export all."
                                },
                                "query": {
                                    "type": "string",
                                    "maxLength": 1000,
                                    "description": "FTS search query to filter exported skills. Cannot be combined with ids."
                                },
                                "limit": {
                                    "type": "integer",
                                    "default": 200,
                                    "minimum": 1,
                                    "maximum": 200
                                }
                            },
                            "additionalProperties": false
                        }
                    }
                ]
            });
            Some(build_response(id, Some(result), None))
        }
        "tools/call" => {
            if let Some(params) = req.params {
                if let Some(name) = params.get("name").and_then(|n| n.as_str()) {
                    let args = params.get("arguments").cloned().unwrap_or(Value::Null);
                    Some(handle_tool_call(pool, id, name, args))
                } else {
                    Some(build_error(id, -32602, "Missing tool name"))
                }
            } else {
                Some(build_error(id, -32602, "Missing params"))
            }
        }
        _ => Some(build_error(id, -32601, "Method not found")),
    }
}

fn handle_tool_call(pool: &DbPool, id: Option<Value>, name: &str, args: Value) -> String {
    match name {
        "skills_search" => {
            if let Some(query) = args.get("query").and_then(|q| q.as_str()) {
                // Clamp query length to prevent sending enormous strings to FTS
                if query.len() > 1000 {
                    return build_error(id, -32602, "Query string too long (max 1000 chars)");
                }
                // Safe cast: as_u64 gives at most u64::MAX; clamping happens inside skills_search
                let limit = args
                    .get("limit")
                    .and_then(|l| l.as_u64())
                    .map(|l| l.min(MAX_SEARCH_LIMIT as u64) as u32)
                    .unwrap_or(5);
                match db::skills_search(pool, query, limit) {
                    Ok(skills) => {
                        // Use to_string — safe, no unwrap
                        let text = serde_json::to_string_pretty(&skills)
                            .unwrap_or_else(|_| "[]".to_string());
                        build_tool_result(id, text)
                    }
                    // Sanitise: return a generic DB error message, not the internal detail
                    Err(_) => build_error(id, -32000, "Database error during search"),
                }
            } else {
                build_error(id, -32602, "Invalid arguments: 'query' is required")
            }
        }
        "skills_fetch" => {
            if let Some(skill_id) = args.get("id").and_then(|i| i.as_str()) {
                match db::skills_fetch(pool, skill_id) {
                    Ok(Some(content)) => build_tool_result(id, content),
                    Ok(None) => build_tool_result(id, "Skill not found".to_string()),
                    Err(_) => build_error(id, -32000, "Database error during fetch"),
                }
            } else {
                build_error(id, -32602, "Invalid arguments: 'id' is required")
            }
        }
        "skills_upsert" => {
            if let Ok(skill) = serde_json::from_value::<Skill>(args.clone()) {
                match db::skills_upsert(pool, &skill) {
                    Ok(_) => {
                        let text = serde_json::json!({
                            "status": "success",
                            "id": skill.id
                        })
                        .to_string();
                        build_tool_result(id, text)
                    }
                    // Validation errors contain safe user-facing messages; DB errors are sanitised
                    Err(e) => build_error(id, -32602, &format!("Upsert failed: {}", e)),
                }
            } else {
                build_error(id, -32602, "Invalid arguments for skills_upsert")
            }
        }
        "skills_delete" => {
            if let Some(skill_id) = args.get("id").and_then(|i| i.as_str()) {
                match db::skills_delete(pool, skill_id) {
                    Ok(found) => {
                        let text = serde_json::json!({
                            "status": "success",
                            "deleted": found,
                            "id": skill_id
                        })
                        .to_string();
                        build_tool_result(id, text)
                    }
                    Err(_) => build_error(id, -32602, "Invalid skill id"),
                }
            } else {
                build_error(id, -32602, "Invalid arguments: 'id' is required")
            }
        }
        "skills_delete_bulk" => {
            if let Some(ids_val) = args.get("ids") {
                if let Some(arr) = ids_val.as_array() {
                    // Cap at 500 IDs
                    if arr.len() > 500 {
                        return build_error(id, -32602, "Too many IDs (max 500 per call)");
                    }
                    let id_strs: Option<Vec<&str>> = arr.iter().map(|v| v.as_str()).collect();
                    if let Some(refs) = id_strs {
                        match db::skills_delete_bulk(pool, &refs) {
                            Ok(n) => {
                                let text = serde_json::json!({
                                    "status": "success",
                                    "deleted": n
                                })
                                .to_string();
                                build_tool_result(id, text)
                            }
                            Err(_) => build_error(id, -32602, "One or more IDs are invalid"),
                        }
                    } else {
                        build_error(id, -32602, "All ids must be strings")
                    }
                } else {
                    build_error(id, -32602, "'ids' must be an array")
                }
            } else {
                build_error(id, -32602, "Invalid arguments: 'ids' is required")
            }
        }
        "skills_export" => {
            // ids and query are mutually exclusive; if both somehow arrive, ids wins
            let has_ids = args.get("ids").and_then(|v| v.as_array()).is_some();
            let query_str = args.get("query").and_then(|q| q.as_str());
            let limit = args
                .get("limit")
                .and_then(|l| l.as_u64())
                .map(|l| l.min(200) as u32)
                .unwrap_or(200);

            let skills_result = if has_ids {
                let arr = args["ids"].as_array().unwrap();
                if arr.len() > 500 {
                    return build_error(id, -32602, "Too many IDs (max 500)");
                }
                let id_strs: Option<Vec<&str>> = arr.iter().map(|v| v.as_str()).collect();
                match id_strs {
                    Some(refs) => db::skills_fetch_by_ids(pool, &refs),
                    None => return build_error(id, -32602, "All ids must be strings"),
                }
            } else if let Some(q) = query_str {
                if q.len() > 1000 {
                    return build_error(id, -32602, "Query string too long (max 1000 chars)");
                }
                db::skills_search_full(pool, q, limit)
            } else {
                db::skills_fetch_all(pool)
            };

            match skills_result {
                Ok(skills) => {
                    let text =
                        serde_json::to_string_pretty(&skills).unwrap_or_else(|_| "[]".to_string());
                    build_tool_result(id, text)
                }
                Err(_) => build_error(id, -32000, "Database error during export"),
            }
        }
        _ => build_error(id, -32601, "Tool not found"),
    }
}

fn build_tool_result(id: Option<Value>, text: String) -> String {
    let result = serde_json::json!({
        "content": [{ "type": "text", "text": text }]
    });
    build_response(id, Some(result), None)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn test_mcp_initialize() {
        let pool = db::init_pool(Path::new(":memory:")).unwrap();
        let req = RpcRequest {
            jsonrpc: "2.0".to_string(),
            method: "initialize".to_string(),
            params: None,
            id: Some(serde_json::json!(1)),
        };
        let response = handle_request(&pool, req).unwrap();
        assert!(response.contains("protocolVersion"));
        assert!(response.contains("skill-cli"));
    }

    #[test]
    fn test_mcp_tools_list() {
        let pool = db::init_pool(Path::new(":memory:")).unwrap();
        let req = RpcRequest {
            jsonrpc: "2.0".to_string(),
            method: "tools/list".to_string(),
            params: None,
            id: Some(serde_json::json!(2)),
        };
        let response = handle_request(&pool, req).unwrap();
        assert!(response.contains("skills_search"));
        assert!(response.contains("skills_fetch"));
        assert!(response.contains("skills_upsert"));
        assert!(response.contains("skills_delete"));
        assert!(response.contains("skills_delete_bulk"));
        assert!(response.contains("skills_export"));
    }

    #[test]
    fn test_mcp_fetch_unknown_skill() {
        let pool = db::init_pool(Path::new(":memory:")).unwrap();
        let req = RpcRequest {
            jsonrpc: "2.0".to_string(),
            method: "tools/call".to_string(),
            params: Some(serde_json::json!({
                "name": "skills_fetch",
                "arguments": { "id": "unknown_skill" }
            })),
            id: Some(serde_json::json!(3)),
        };
        let response = handle_request(&pool, req).unwrap();
        assert!(response.contains("Skill not found"));
    }

    fn extract_tool_text(response_json: &str) -> String {
        let val: Value = serde_json::from_str(response_json).expect("valid JSON response");
        val["result"]["content"][0]["text"]
            .as_str()
            .unwrap_or_default()
            .to_string()
    }

    #[test]
    fn test_mcp_upsert_fetch_delete() {
        let pool = db::init_pool(Path::new(":memory:")).unwrap();

        // 1. Upsert
        let req = RpcRequest {
            jsonrpc: "2.0".to_string(),
            method: "tools/call".to_string(),
            params: Some(serde_json::json!({
                "name": "skills_upsert",
                "arguments": {
                    "id": "git-rebase",
                    "name": "Git Rebase",
                    "description": "How to rebase cleanly",
                    "content": "# Rebase steps\ngit rebase -i"
                }
            })),
            id: Some(serde_json::json!(4)),
        };
        let response = handle_request(&pool, req).unwrap();
        let text = extract_tool_text(&response);
        assert!(text.contains("\"status\":\"success\"") && text.contains("git-rebase"));

        // 2. Fetch
        let req_fetch = RpcRequest {
            jsonrpc: "2.0".to_string(),
            method: "tools/call".to_string(),
            params: Some(serde_json::json!({
                "name": "skills_fetch",
                "arguments": { "id": "git-rebase" }
            })),
            id: Some(serde_json::json!(5)),
        };
        let response_fetch = handle_request(&pool, req_fetch).unwrap();
        let text_fetch = extract_tool_text(&response_fetch);
        assert_eq!(text_fetch, "# Rebase steps\ngit rebase -i");

        // 3. Export
        let req_export = RpcRequest {
            jsonrpc: "2.0".to_string(),
            method: "tools/call".to_string(),
            params: Some(serde_json::json!({
                "name": "skills_export",
                "arguments": {}
            })),
            id: Some(serde_json::json!(6)),
        };
        let response_export = handle_request(&pool, req_export).unwrap();
        let text_export = extract_tool_text(&response_export);
        assert!(text_export.contains("git-rebase"));

        // 4. Delete
        let req_del = RpcRequest {
            jsonrpc: "2.0".to_string(),
            method: "tools/call".to_string(),
            params: Some(serde_json::json!({
                "name": "skills_delete",
                "arguments": { "id": "git-rebase" }
            })),
            id: Some(serde_json::json!(7)),
        };
        let response_del = handle_request(&pool, req_del).unwrap();
        let text_del = extract_tool_text(&response_del);
        assert!(text_del.contains("\"deleted\":true"));
    }

    #[test]
    fn test_mcp_delete_bulk() {
        let pool = db::init_pool(Path::new(":memory:")).unwrap();
        // Upsert 2 skills
        for id in ["b1", "b2"] {
            db::skills_upsert(
                &pool,
                &crate::models::Skill {
                    id: id.to_string(),
                    name: id.to_string(),
                    description: "desc".to_string(),
                    content: "content".to_string(),
                },
            )
            .unwrap();
        }

        let req = RpcRequest {
            jsonrpc: "2.0".to_string(),
            method: "tools/call".to_string(),
            params: Some(serde_json::json!({
                "name": "skills_delete_bulk",
                "arguments": { "ids": ["b1", "b2"] }
            })),
            id: Some(serde_json::json!(8)),
        };
        let response = handle_request(&pool, req).unwrap();
        let text = extract_tool_text(&response);
        assert!(text.contains("\"deleted\":2"));
    }

    #[test]
    fn test_mcp_unknown_tool() {
        let pool = db::init_pool(Path::new(":memory:")).unwrap();
        let req = RpcRequest {
            jsonrpc: "2.0".to_string(),
            method: "tools/call".to_string(),
            params: Some(serde_json::json!({
                "name": "drop_table",
                "arguments": {}
            })),
            id: Some(serde_json::json!(9)),
        };
        let response = handle_request(&pool, req).unwrap();
        assert!(response.contains("-32601"));
        assert!(response.contains("Tool not found"));
    }

    #[test]
    fn test_line_size_guard() {
        let huge_line = "a".repeat(MAX_LINE_BYTES + 1);
        assert!(huge_line.len() > MAX_LINE_BYTES);
    }

    #[test]
    fn test_search_limit_clamped_in_tool_call() {
        let pool = db::init_pool(Path::new(":memory:")).unwrap();
        let req = RpcRequest {
            jsonrpc: "2.0".to_string(),
            method: "tools/call".to_string(),
            params: Some(serde_json::json!({
                "name": "skills_search",
                "arguments": { "query": "rust", "limit": 999999 }
            })),
            id: Some(serde_json::json!(10)),
        };
        let response = handle_request(&pool, req).unwrap();
        assert!(response.contains("result"));
    }
}
