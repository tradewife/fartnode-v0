# Devnet Airdrop Runbook

> SST: [Solana Cookbook – Getting Test SOL](https://solana.com/cookbook/development/test-sol?utm_source=llms&utm_medium=ai&utm_campaign=txt)

## Endpoint Inventory
| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/actions/devnet-airdrop` | Returns Action metadata (labels, icons, cluster default, and minimum/maximum lamports). |
| `POST` | `/actions/devnet-airdrop` | Composes and (optionally) broadcasts an airdrop transaction. Set `simulate: true` to dry-run. |

## cURL Examples

### 1. Discover Metadata (GET)
```bash
curl -sS "https://<worker-host>/actions/devnet-airdrop?cluster=devnet"
```

### 2. Simulate First (POST)
```bash
curl -sS -X POST "https://<worker-host>/actions/devnet-airdrop" \
  -H "Content-Type: application/json" \
  -d '{
    "account": "Fakesk111111111111111111111111111111111111111",
    "lamports": 2000000000,
    "simulate": true
  }'
```
- Response contains `simulationLogs`, compute units, and a base64 transaction. No RPC state is mutated.

### 3. Broadcast After Simulation (POST)
```bash
curl -sS -X POST "https://<worker-host>/actions/devnet-airdrop" \
  -H "Content-Type: application/json" \
  -d '{
    "account": "Fakesk111111111111111111111111111111111111111",
    "lamports": 2000000000,
    "simulate": false
  }'
```
- The Worker reuses the simulated transaction, attaches priority fee defaults, and relays it to `https://api.devnet.solana.com`.

## Simulate-First Checklist
1. Fetch metadata and honour `maxLamports` before composing the request.
2. Always invoke the simulation POST (or `solana` CLI’s `--simulate` flag) and inspect logs for account/rent failures.
3. Cache the `blockhash` and `lastValidBlockHeight` returned by simulation; replay them within the expiry window when submitting the real POST.

## Troubleshooting with Solana CLI
```bash
solana config set --url https://api.devnet.solana.com
solana airdrop 2 <RECIPIENT_PUBKEY> --output json
solana balance <RECIPIENT_PUBKEY> --output json
```
- Use `solana logs -u devnet` to tail cluster feedback if the Worker reports RPC errors (`Accounts: missing signer`, etc.).
