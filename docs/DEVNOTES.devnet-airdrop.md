# Devnet Airdrop Action

The Devnet airdrop Action lives in `apps/action-worker` and exposes a GET/POST pair for Solana clients. All values returned are scoped to **devnet** and expect clients to simulate before broadcasting.

## Endpoints

- `GET /api/solana/devnet-airdrop` — Action metadata
- `POST /api/solana/devnet-airdrop` — Compose the versioned transaction

## Requests

```bash
curl -s http://127.0.0.1:8787/api/solana/devnet-airdrop
```

```bash
curl -s -X POST http://127.0.0.1:8787/api/solana/devnet-airdrop \
  -H "Content-Type: application/json" \
  -d '{"publicKey":"<YOUR_PUBKEY>","amountSol":1}'
```

## Behaviour

- Server requests a devnet airdrop best-effort and returns a placeholder Versioned Transaction.
- Response payload always sets `simulateFirst: true`; clients should run `simulateTransaction` before submit.
- Rate limiting and idempotency hooks fall back to in-memory stubs until Durable Objects / KV bindings are available.
