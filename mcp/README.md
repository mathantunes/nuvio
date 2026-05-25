# @globudget/mcp

Minimal MCP server for read-only access to Globudget data.

## Setup

```bash
cd mcp
npm install
npm run build
```

## Run

```bash
MCP_USER_ID=<uuid> DATABASE_URL=postgres://globudget:globudget@localhost:5432/globudget npm start
```

## Claude Desktop

```json
{
  "mcpServers": {
    "globudget": {
      "command": "node",
      "args": [
        "/path/to/globudget/mcp/dist/index.js"
      ],
      "env": {
        "MCP_USER_ID": "<uuid>",
        "DATABASE_URL": "postgres://globudget:globudget@localhost:5432/globudget"
      }
    }
  }
}
```
