# Contributing to skill-cli

Thank you for taking the time to contribute! This project is open source under the **Apache License 2.0** and welcomes contributions of all kinds.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Development Setup](#development-setup)
- [Submitting Changes](#submitting-changes)
- [Code Style](#code-style)
- [Commit Messages](#commit-messages)

---

## Code of Conduct

Please read and follow our [Code of Conduct](./CODE_OF_CONDUCT.md). We are committed to providing a welcoming, respectful environment for everyone.

---

## Ways to Contribute

- 🐛 **Report bugs** — Open an issue describing the problem and how to reproduce it.
- 💡 **Request features** — Open an issue describing the use case and the desired behaviour.
- 📖 **Improve docs** — Fix typos, clarify wording, or add missing sections in `docs/`.
- 🔧 **Submit code** — Fix bugs, add features, or improve performance.
- 🧪 **Add tests** — Increase coverage for database queries or MCP protocol handling.

---

## Development Setup

### Prerequisites

- [Rust toolchain](https://rustup.rs/) ≥ 1.70 (2024 edition)
- `git`

### Build and Test

```bash
git clone <repo-url>
cd skill-cli

# Check everything compiles
cargo check

# Run lints
cargo clippy

# Run all tests
cargo test

# Build optimised binary
cargo build --release
```

### Project Structure

```
src/
├── main.rs       # CLI entry point and routing
├── cli.rs        # Clap argument definitions
├── db.rs         # SQLite + FTS5 layer (add DB tests here)
├── mcp.rs        # JSON-RPC 2.0 MCP server (add MCP tests here)
└── models.rs     # Shared data types
docs/             # Diátaxis documentation
```

---

## Submitting Changes

1. **Fork** the repository and create a branch from `main`:
   ```bash
   git checkout -b fix/my-bug-description
   ```

2. **Make your changes** with clear, focused commits.

3. **Run the test suite** and ensure it passes:
   ```bash
   cargo test
   cargo clippy -- -D warnings
   ```

4. **Open a Pull Request** against `main` with:
   - A clear title and description
   - A reference to any related issues (e.g., `Closes #42`)
   - A brief summary of what changed and why

---

## Code Style

- Follow standard Rust idioms. Run `cargo fmt` before committing.
- Use `cargo clippy` and address all warnings (warnings are treated as errors in CI).
- All public functions should have doc comments (`///`).
- Keep functions small and focused; prefer returning `Result` over `unwrap()` in library code.

---

## Commit Messages

Use the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <short summary>

[optional body]
```

| Type | When to use |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only changes |
| `refactor` | Code change that is neither a bug fix nor a feature |
| `test` | Adding or updating tests |
| `chore` | Build process or tooling changes |

**Examples:**
```
feat(mcp): add pagination support to skills_search
fix(db): handle empty query string in FTS5 MATCH
docs(reference): add examples to MCP tools page
```

---

## License

By contributing, you agree that your contributions will be licensed under the [Apache License 2.0](./LICENSE). You retain copyright to your contributions; the NOTICE file will be updated to acknowledge significant contributors.
