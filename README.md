# pg-inspector-mcp

A secure, host-agnostic MCP (Model Context Protocol) server for PostgreSQL. It lets AI coding assistants (VS Code Copilot, Claude Code, Cursor, etc.) safely inspect your database schema, understand relationships, and run read-only queries.

## Features

- **Secure by design** – DB credentials never reach the LLM; managed via a local CLI companion.
- **Token-efficient** – merged `describe_table` returns columns, constraints and indexes in one call.
- **Smart search** – find tables/columns by keyword instead of dumping the whole schema.
- **Safe execution** – bounded, read-only SQL with automatic result truncation.
- **Performance insights** – JSON query plans for the AI to reason about slow queries.

## Installation & Setup

### 1. Install the package
Install **globally** for a one-time, all-projects setup:
```bash
npm install -g @neb23x/pg-inspector-mcp
```
You can also install **locally** in a project (`npm i @neb23x/pg-inspector-mcp`) to pin the version per repo — this is recommended when you want reproducible, project-scoped tooling.

### 2. Configure your database
Run the interactive setup once to store your connection string securely on disk:
```bash
pg-inspector-mcp add-db
```
This writes `~/.pg-inspector/connections.json`. The LLM only ever sees the **alias** you choose (e.g. `default`, `staging`) — never the URL.

### 3. Connect to your MCP host

**VS Code — two scopes, pick one:**

*Option A · Workspace (per-folder)* — create `.vscode/mcp.json` in the project where you installed the package locally:
```json
{
  "servers": {
    "pg-inspector": {
      "type": "stdio",
      "command": "npx",
      "args": ["-p", "@neb23x/pg-inspector-mcp@latest", "pg-inspector-server"]
    }
  }
}
```

*Option B · Global (all projects)* — edit `~/.copilot/mcp-config.json` (Windows: `C:\Users\<you>\.copilot\mcp-config.json`). Use this when you installed **globally**. Same server block as above:
```json
{
  "mcpServers": {
    "pg-inspector": {
      "type": "stdio",
      "command": "npx",
      "args": ["-p", "@neb23x/pg-inspector-mcp@latest", "pg-inspector-server"]
    }
  }
}
```

**Other hosts (Claude Desktop / Claude Code / Cursor):** same pattern — point the host at the `pg-inspector-server` binary via `npx -p … pg-inspector-server`. Adapt to each host's own config file and top-level key (`mcpServers` for Claude/Cursor, `servers` for VS Code) per their docs.

> **About `-y`:** Start without `-y` as shown. If your MCP host cannot launch the server because `npx` needs an install confirmation (for example, the agent reports “server not connected”), add `-y` before `-p` to approve the install automatically.

## Available Tools

| Tool | Description |
|---|---|
| `list_available_databases` | Lists configured database aliases. |
| `switch_database` | Changes the active database context. |
| `get_database_overview` | High-level schema + context metadata. |
| `search_schema` | Search tables/columns by keyword. |
| `describe_table` | Deep dive: columns, types, PKs, FKs, indexes. |
| `execute_safe_query` | Bounded, read-only SELECT with truncation. |
| `explain_query` | JSON query execution plan. |

## Security Best Practices

For production, **never use a superuser**. Create a dedicated read-only role:
```sql
CREATE ROLE mcp_reader WITH LOGIN PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE your_db TO mcp_reader;
GRANT USAGE ON SCHEMA public TO mcp_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO mcp_reader;
```

## Development & Contributing

1. Clone the repo and run `npm install`.
2. Add a local DB to the CLI: `npx tsx src/cli.ts`.
3. Run integration tests (requires Docker): `npm run test`.
4. Before publishing, follow the [npm release skill](.github/skills/npm-release/SKILL.md) and update the [release history](CHANGELOG.md).

> **Contributor note:** the test suite (Vitest) requires **Node.js 22+**. End users only need **Node.js 20+** to run the published server.

## License
MIT
