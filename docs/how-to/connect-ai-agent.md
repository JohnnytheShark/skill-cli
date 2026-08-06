# How-to: Connect an AI Agent via MCP

> **Type:** How-to — *Task-oriented*
>
> **Goal:** Configure an MCP-compatible AI agent (e.g. Claude Desktop, a custom agent, or Antigravity) to call `skill-cli` as a tool server.

---

## How MCP stdio transport works

`skill-cli serve` reads JSON-RPC 2.0 messages from `stdin` line by line and writes responses to `stdout`. The hosting agent process is responsible for spawning the binary and wiring up the pipes.

---

## Option A: Antigravity / Claude Desktop (`mcp_config.json`)

Add an entry to your MCP configuration file:

```json
{
  "mcpServers": {
    "skill-engine": {
      "command": "skill-cli",
      "args": ["serve"],
      "env": {}
    }
  }
}
```

> **Tip:** If `skill-cli` is not on your `PATH`, replace `"skill-cli"` with the full absolute path to the binary, e.g. `"C:\\Users\\you\\skill-cli\\target\\release\\skill-cli.exe"`.

After saving, restart your agent/IDE. The tools `skills_search`, `skills_fetch`, and `skills_upsert` will appear in the tools list.

---

## Option B: Manual stdio test

You can speak the MCP protocol directly:

```bash
# Start the server in the background
skill-cli serve &
SERVER_PID=$!

# Send an initialize message
echo '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}' | skill-cli serve

# List available tools
echo '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":2}' | skill-cli serve

kill $SERVER_PID
```

---

## Option C: Custom Agent (Python example)

```python
import subprocess
import json

proc = subprocess.Popen(
    ["skill-cli", "serve"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    text=True,
)

def call(method, params=None, req_id=1):
    msg = json.dumps({"jsonrpc": "2.0", "method": method, "params": params or {}, "id": req_id})
    proc.stdin.write(msg + "\n")
    proc.stdin.flush()
    return json.loads(proc.stdout.readline())

# Initialize
call("initialize")
call("notifications/initialized")

# Search for a skill
result = call("tools/call", {"name": "skills_search", "arguments": {"query": "git", "limit": 3}})
print(result)
```

---

## Verifying the connection

Once connected, ask your agent:
> *"Search my skill engine for anything related to git."*

The agent should invoke `skills_search`, receive metadata, then optionally call `skills_fetch` to retrieve the full Markdown content and inject it into its context.
