# Reference: Configuration

> **Type:** Reference — *Information-oriented*
>
> How `skill-cli` resolves runtime configuration.

---

## Database Path

`skill-cli` uses the `dirs` crate to locate the platform config directory, then appends `skills/skills.db`.

| Platform | Resolved path |
|---|---|
| Linux | `$XDG_CONFIG_HOME/skills/skills.db` or `~/.config/skills/skills.db` |
| macOS | `~/Library/Application Support/skills/skills.db` |
| Windows | `%APPDATA%\skills\skills.db` |

The `skills/` subdirectory is created automatically if it does not exist.

---

## There is no config file

`skill-cli` is intentionally zero-config. All behavior is driven by:

1. CLI flags (e.g. `--dir`)
2. The OS platform (for DB path resolution)
3. The content of the database itself

---

## Logging

All diagnostic output (startup messages, errors) is written to `stderr`. This allows `stdout` to remain a clean JSON-RPC 2.0 stream when running in `serve` mode.

To suppress all stderr output:
```bash
skill-cli serve 2>/dev/null
```

To capture stderr separately:
```bash
skill-cli serve 2>skill-cli-errors.log
```

---

## Compilation Features

The project uses the `bundled-full` feature of `rusqlite`, which statically links SQLite (including FTS5) into the binary. **No system SQLite installation is required.**

```toml
rusqlite = { version = "0.31", features = ["bundled", "bundled-full"] }
```

This produces a self-contained binary with zero runtime library dependencies for the database layer.
