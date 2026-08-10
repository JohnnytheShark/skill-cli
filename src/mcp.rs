use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::io::{self, BufRead, Write};

use crate::db::{self, DbPool, MAX_SEARCH_LIMIT};
use crate::models::{Item, ItemType};

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
                                "limit": { "type": "integer", "default": 5, "minimum": 1, "maximum": MAX_SEARCH_LIMIT }
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
                            "properties": { "id": { "type": "string", "maxLength": 256 } },
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
                            "properties": { "id": { "type": "string", "maxLength": 256, "pattern": "^[a-zA-Z0-9_-]+$" } },
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
                        "description": "Export skills as a JSON array of complete skill objects. Optionally filter by ids or FTS query.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "ids": { "type": "array", "items": { "type": "string", "maxLength": 256 } },
                                "query": { "type": "string", "maxLength": 1000 },
                                "limit": { "type": "integer", "default": 200, "minimum": 1, "maximum": 200 }
                            },
                            "additionalProperties": false
                        }
                    },
                    {
                        "name": "agents_search",
                        "description": "Queries agents_fts. Returns ONLY high-level metadata (ID, name, description)",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "query": { "type": "string", "maxLength": 1000 },
                                "limit": { "type": "integer", "default": 5, "minimum": 1, "maximum": MAX_SEARCH_LIMIT }
                            },
                            "required": ["query"],
                            "additionalProperties": false
                        }
                    },
                    {
                        "name": "agents_fetch",
                        "description": "Fetches full content for a single agent ID",
                        "inputSchema": {
                            "type": "object",
                            "properties": { "id": { "type": "string", "maxLength": 256 } },
                            "required": ["id"],
                            "additionalProperties": false
                        }
                    },
                    {
                        "name": "agents_upsert",
                        "description": "Inserts or updates an agent in SQLite and refreshes FTS indexes",
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
                        "name": "agents_delete",
                        "description": "Delete a single agent by ID. Returns whether the agent existed.",
                        "inputSchema": {
                            "type": "object",
                            "properties": { "id": { "type": "string", "maxLength": 256, "pattern": "^[a-zA-Z0-9_-]+$" } },
                            "required": ["id"],
                            "additionalProperties": false
                        }
                    },
                    {
                        "name": "agents_delete_bulk",
                        "description": "Delete multiple agents by ID in one call. Returns count deleted.",
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
                        "name": "agents_export",
                        "description": "Export agents as a JSON array of complete agent objects. Optionally filter by ids or FTS query.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "ids": { "type": "array", "items": { "type": "string", "maxLength": 256 } },
                                "query": { "type": "string", "maxLength": 1000 },
                                "limit": { "type": "integer", "default": 200, "minimum": 1, "maximum": 200 }
                            },
                            "additionalProperties": false
                        }
                    },
                    {
                        "name": "log_usage",
                        "description": "Logs the usage of a skill or agent for metrics tracking.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "id": { "type": "string", "maxLength": 256 },
                                "type": { "type": "string", "enum": ["skill", "agent"] }
                            },
                            "required": ["id", "type"],
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
    let (item_type, action) = if name.starts_with("skills_") {
        (Some(ItemType::Skill), &name["skills_".len()..])
    } else if name.starts_with("agents_") {
        (Some(ItemType::Agent), &name["agents_".len()..])
    } else {
        (None, name)
    };

    if let Some(t) = item_type {
        return handle_item_tool_call(pool, id, action, args, t);
    }

    if name == "log_usage" {
        let item_id = args.get("id").and_then(|i| i.as_str());
        let item_type_str = args.get("type").and_then(|t| t.as_str());

        if let (Some(id_str), Some(type_str)) = (item_id, item_type_str) {
            let parsed_type = match type_str {
                "skill" => Some(ItemType::Skill),
                "agent" => Some(ItemType::Agent),
                _ => None,
            };

            if let Some(t) = parsed_type {
                match db::log_usage(pool, id_str, t) {
                    Ok(_) => {
                        let text = serde_json::json!({"status": "success"}).to_string();
                        build_tool_result(id, text)
                    }
                    Err(e) => build_error(id, -32602, &format!("Failed to log usage: {}", e)),
                }
            } else {
                build_error(id, -32602, "Invalid type, must be 'skill' or 'agent'")
            }
        } else {
            build_error(
                id,
                -32602,
                "Invalid arguments: 'id' and 'type' are required",
            )
        }
    } else {
        build_error(id, -32601, "Tool not found")
    }
}

fn handle_item_tool_call(
    pool: &DbPool,
    id: Option<Value>,
    action: &str,
    args: Value,
    item_type: ItemType,
) -> String {
    match action {
        "search" => {
            if let Some(query) = args.get("query").and_then(|q| q.as_str()) {
                if query.len() > 1000 {
                    return build_error(id, -32602, "Query string too long (max 1000 chars)");
                }
                let limit = args
                    .get("limit")
                    .and_then(|l| l.as_u64())
                    .map(|l| l.min(MAX_SEARCH_LIMIT as u64) as u32)
                    .unwrap_or(5);
                match db::item_search(pool, query, item_type, limit) {
                    Ok(items) => {
                        let text = serde_json::to_string_pretty(&items)
                            .unwrap_or_else(|_| "[]".to_string());
                        build_tool_result(id, text)
                    }
                    Err(_) => build_error(id, -32000, "Database error during search"),
                }
            } else {
                build_error(id, -32602, "Invalid arguments: 'query' is required")
            }
        }
        "fetch" => {
            if let Some(item_id) = args.get("id").and_then(|i| i.as_str()) {
                match db::item_fetch(pool, item_id, item_type.clone()) {
                    Ok(Some(content)) => build_tool_result(id, content),
                    Ok(None) => build_tool_result(id, format!("{} not found", item_type)),
                    Err(_) => build_error(id, -32000, "Database error during fetch"),
                }
            } else {
                build_error(id, -32602, "Invalid arguments: 'id' is required")
            }
        }
        "upsert" => {
            if let Ok(item) = serde_json::from_value::<Item>(args.clone()) {
                match db::item_upsert(pool, &item, item_type) {
                    Ok(_) => {
                        let text = serde_json::json!({
                            "status": "success",
                            "id": item.id
                        })
                        .to_string();
                        build_tool_result(id, text)
                    }
                    Err(e) => build_error(id, -32602, &format!("Upsert failed: {}", e)),
                }
            } else {
                build_error(id, -32602, "Invalid arguments for upsert")
            }
        }
        "delete" => {
            if let Some(item_id) = args.get("id").and_then(|i| i.as_str()) {
                match db::item_delete(pool, item_id, item_type) {
                    Ok(found) => {
                        let text = serde_json::json!({
                            "status": "success",
                            "deleted": found,
                            "id": item_id
                        })
                        .to_string();
                        build_tool_result(id, text)
                    }
                    Err(_) => build_error(id, -32602, "Invalid id"),
                }
            } else {
                build_error(id, -32602, "Invalid arguments: 'id' is required")
            }
        }
        "delete_bulk" => {
            if let Some(ids_val) = args.get("ids") {
                if let Some(arr) = ids_val.as_array() {
                    if arr.len() > 500 {
                        return build_error(id, -32602, "Too many IDs (max 500 per call)");
                    }
                    let id_strs: Option<Vec<&str>> = arr.iter().map(|v| v.as_str()).collect();
                    if let Some(refs) = id_strs {
                        match db::item_delete_bulk(pool, &refs, item_type) {
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
        "export" => {
            let has_ids = args.get("ids").and_then(|v| v.as_array()).is_some();
            let query_str = args.get("query").and_then(|q| q.as_str());
            let limit = args
                .get("limit")
                .and_then(|l| l.as_u64())
                .map(|l| l.min(200) as u32)
                .unwrap_or(200);

            let items_result = if has_ids {
                let arr = args["ids"].as_array().unwrap();
                if arr.len() > 500 {
                    return build_error(id, -32602, "Too many IDs (max 500)");
                }
                let id_strs: Option<Vec<&str>> = arr.iter().map(|v| v.as_str()).collect();
                match id_strs {
                    Some(refs) => db::item_fetch_by_ids(pool, &refs, item_type.clone()),
                    None => return build_error(id, -32602, "All ids must be strings"),
                }
            } else if let Some(q) = query_str {
                if q.len() > 1000 {
                    return build_error(id, -32602, "Query string too long (max 1000 chars)");
                }
                db::item_search_full(pool, q, item_type.clone(), limit)
            } else {
                db::item_fetch_all(pool, item_type.clone())
            };

            match items_result {
                Ok(items) => {
                    let text =
                        serde_json::to_string_pretty(&items).unwrap_or_else(|_| "[]".to_string());
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
        assert!(response.contains("agents_search"));
        assert!(response.contains("agents_fetch"));
    }

    #[test]
    fn test_mcp_fetch_unknown_item() {
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
        assert!(response.contains("skill not found"));
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
    }
}
