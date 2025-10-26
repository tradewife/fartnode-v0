# MCP Paid Tools Example

Simple Streamable HTTP MCP server with one x402-protected tool and one free ping tool.

## Run locally

```bash
pnpm install
SOL_RECIPIENT=<devnet-address> pnpm --filter mcp-paid-tools start
```

Then point your MCP client to `http://localhost:8787/mcp`.
