# @fartnode/action-worker

Cloudflare Worker that exposes a Solana Devnet airdrop Action.

## Development

- Install dependencies from the repo root: `pnpm install`
- Run the worker locally: `pnpm -C apps/action-worker dev`

## API

- `GET /api/solana/devnet-airdrop` — returns the action metadata
- `POST /api/solana/devnet-airdrop` — validates input and returns a versioned transaction

### cURL Examples

```bash
curl -s http://127.0.0.1:8787/api/solana/devnet-airdrop
```

```bash
curl -s -X POST http://127.0.0.1:8787/api/solana/devnet-airdrop \
  -H "Content-Type: application/json" \
  -d '{"publicKey":"<YOUR_PUBKEY>","amountSol":1}'
```

## Notes

- The worker reads `SOLANA_RPC_URL` from Wrangler variables (defaults to devnet).
- Idempotency and rate-limiting are stubbed; wire them to KV/Durable Objects when available.
- Always simulate transactions client-side before broadcasting.
