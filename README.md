# pg-inspector-mcp

A secure, host-agnostic MCP (Model Context Protocol) server for PostgreSQL. It allows AI coding assistants (like VS Code Copilot, Claude Code, and Cursor) to safely inspect your database schema, understand relationships, and execute read-only queries.

## Features

- **Secure by Design**: Database credentials are never exposed to the LLM. Managed securely via a local CLI companion.
- **Token-Efficient**: Merged introspection tools (`describe_table`) provide columns, constraints, and indexes in a single call.
- **Smart Search**: Find tables and columns instantly without dumping the entire schema into the context window.
- **Safe Execution**: Bounded, read-only SQL execution with automatic result truncation.
- **Performance Insights**: Generate JSON query plans to help the AI optimize slow queries.

## Installation & Setup

### 1. Install the CLI
```bash
npm install -g @neb23x/pg-inspector-mcp
```

### 2. Configure your Database
Run the interactive setup command to securely store your connection string locally:
```bash
pg-inspector-mcp add-db
```
*This creates a secure config file at `~/.pg-inspector/connections.json`.*

### 3. Connect to your MCP Host

**For VS Code (Copilot):**
Add this to your `.vscode/mcp.json`:
```json
{
  "servers": {
    "pg-inspector": {
      "command": "npx",
      "args": ["-p", "@neb23x/pg-inspector-mcp@latest", "pg-inspector-server"]
    }
  }
}
```

**For Claude Desktop / Cursor:**
Add this to your host's MCP configuration file:
```json
{
  "mcpServers": {
    "pg-inspector": {
      "command": "npx",
      "args": ["-p", "@neb23x/pg-inspector-mcp@latest", "pg-inspector-server"]
    }
  }
}
```

## Available Tools

| Tool | Description |
|---|---|
| `list_available_databases` | Lists configured database aliases. |
| `switch_database` | Changes the active database context. |
| `get_database_overview` | High-level schema and context metadata. |
| `search_schema` | Search for tables/columns by keyword. |
| `describe_table` | Deep dive: columns, types, PKs, FKs, and indexes. |
| `execute_safe_query` | Run bounded, read-only SELECT queries. |
| `explain_query` | Get JSON query execution plans. |

## Security Best Practices

For production environments, **do not use a superuser**. Create a dedicated read-only role for the MCP server:

```sql
CREATE ROLE mcp_reader WITH LOGIN PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE your_db TO mcp_reader;
GRANT USAGE ON SCHEMA public TO mcp_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO mcp_reader;
```

## Development & Contributing

1. Clone the repo and run `npm install`.
2. Add your local database to the CLI: `npx tsx src/cli.ts`.
3. Run the integration tests (requires Docker): `npm run test`.

## License
MIT
