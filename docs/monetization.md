# Solana Monetization Kit (x402)

The `@fartnode/monetize-solana` package adds optional, Solana-native paywalls to Hono routes and MCP tools using the [x402 payment protocol](https://github.com/coinbase/x402). It ships with Cloudflare Worker and MCP examples plus helpers for FARTNODE apps.

## Quickstart

1. Install dependencies from the monorepo root (already included in the workspace):
   ```bash
   pnpm install
   pnpm -C packages/monetize-solana build
   ```
2. Create a `fartnode.x402.json` file at your service root or set environment variables (see below).
3. Wrap your Hono app:
   ```ts
   import { withFartnodeX402 } from "@fartnode/monetize-solana";

   const app = new Hono();
   withFartnodeX402(app);
   ```
4. (Optional) Register paid routes dynamically:
   ```ts
   registerPaid(app, "POST /api/mood", { price: "$0.02", network: "solana-devnet" });
   ```
5. For MCP servers:
   ```ts
   import { createPaidMcpServer } from "@fartnode/monetize-solana";

   const server = createPaidMcpServer(tools, {
     recipient: process.env.SOL_RECIPIENT!,
     defaultNetwork: "solana-devnet"
   });
   ```

## Configuration

`withFartnodeX402` loads monetization settings from:

1. Inline config passed to the helper.
2. `fartnode.x402.json` in the current working directory.
3. Environment variables.

### JSON structure

```json
{
  "recipient": "Fg9q…YourDevnetAddress",
  "facilitatorUrl": "https://x402.org/facilitator",
  "routes": {
    "POST /api/vibe/build": {
      "price": "$0.10",
      "network": "solana-devnet",
      "config": {
        "description": "Build a vibe app",
        "outputSchema": {
          "type": "object"
        }
      }
    }
  }
}
```

### Environment overrides

| Variable                 | Purpose                                    | Default                         |
| ------------------------ | ------------------------------------------ | ------------------------------- |
| `SOL_RECIPIENT`          | Base58 Solana address to receive payments  | _required_                      |
| `X402_FACILITATOR_URL`   | x402 facilitator endpoint                  | `https://x402.org/facilitator`  |
| `X402_NETWORK`           | Network fallback for routes                | `solana-devnet`                 |

## MCP monetization

`createPaidMcpServer(tools, config)` wraps paid tools by inspecting the `X-PAYMENT` header (or `_meta.x402Payment` field) on requests. Provide a `validatePayment` callback to call your preferred x402 verification service.

Each paid tool can define `monetize` metadata (price, network, optional x402 metadata). Free tools omit this block.

See `examples/mcp-paid-tools` for a Streamable HTTP server with one paid and one free tool.

## Networks

| Key             | Description               | Facilitator Notes                    |
| --------------- | ------------------------- | ------------------------------------ |
| `solana-devnet` | Public devnet facilitator | Uses `https://x402.org/facilitator`  |
| `solana`        | Mainnet cdp facilitator   | Supply a CDP-backed facilitator URL  |

Set `useCdp: true` in config when swapping to a private facilitator on mainnet and handle authentication in your own code.
