# Devnet Airdrop Runbook

> SST: [Solana Cookbook – Getting Test SOL](https://solana.com/cookbook/development/test-sol?utm_source=llms&utm_medium=ai&utm_campaign=txt)

The Devnet airdrop Action lives in `apps/action-worker` and exposes a GET/POST pair for Solana clients. All flows assume **Devnet** and expect downstream wallets to simulate before broadcasting.

## Endpoint Inventory
| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/solana/devnet-airdrop` | Returns Action metadata (title, description, inputs, defaults). |
| `POST` | `/api/solana/devnet-airdrop` | Requests a devnet airdrop best-effort and returns a placeholder Versioned Transaction (simulate-first). |

## cURL Examples (local Wrangler dev)

```bash
# 1. Discover metadata
curl -s http://127.0.0.1:8787/api/solana/devnet-airdrop
```

```bash
# 2. Compose transaction (simulate-first downstream)
curl -s -X POST http://127.0.0.1:8787/api/solana/devnet-airdrop \
  -H "Content-Type: application/json" \
  -d '{"publicKey":"<YOUR_PUBKEY>","amountSol":1}'
```

## Behaviour

- Worker pulls `SOLANA_RPC_URL` from environment (defaults to `https://api.devnet.solana.com`) and issues a best-effort `requestAirdrop`.
- Response payload always sets `simulateFirst: true`; clients should call `simulateTransaction` before submit.
- Placeholder transaction contains compute budget + priority fee instructions plus a memo (`"FARTNODE demo"`) so wallets can display intent.
- Rate limiting and idempotency fall back to in-memory stubs until Durable Objects / KV bindings are configured.

## Simulate-First Checklist
1. Fetch metadata and honour the default limits (`amountSol <= 5`) before composing the request.
2. Run the POST endpoint, capture the returned `transaction` (base64), and simulate client-side.
3. Cache the `blockhash` and `lastValidBlockHeight` from simulation; sign and broadcast before expiry.

## Troubleshooting with Solana CLI
```bash
solana config set --url https://api.devnet.solana.com
solana airdrop 2 <RECIPIENT_PUBKEY> --output json
solana balance <RECIPIENT_PUBKEY> --output json
solana logs -u devnet
```
- Helpful when the worker reports RPC errors (e.g. `AccountNotFound`, rent exemptions, compute exhaustion).
