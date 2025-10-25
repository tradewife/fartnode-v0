# Devnet Airdrop Action

Cloudflare Worker endpoint that composes a Solana Devnet airdrop transaction. The returned payload is compatible with Solana Actions/Blinks, exposes the `transaction` base64 string, and always sets `simulateFirst: true` to encourage client-side verification.

## Metadata

```bash
curl -s http://127.0.0.1:8787/api/solana/devnet-airdrop | jq
```

## Compose Transaction

```bash
curl -s -X POST http://127.0.0.1:8787/api/solana/devnet-airdrop \
  -H "Content-Type: application/json" \
  -d '{"publicKey":"<RECIPIENT_PUBLIC_KEY>","amountSol":1}' | jq
```

The response contains:

- `transaction`: base64-encoded VersionedTransaction with compute budget, priority fee, and memo instruction (`"FARTNODE demo"`).
- `message`: reminder to simulate before signing.
- `simulationLogs`: best-effort dry-run logs from `simulateTransaction`.
- `simulateFirst: true`: clients should run their own simulation before broadcasting.
- `network: "devnet"`: route to the correct RPC cluster.

Workflow:

1. Decode the base64 payload.
2. Simulate the transaction locally (respect `simulateFirst: true`).
3. Sign with the recipient wallet before broadcasting to devnet.
