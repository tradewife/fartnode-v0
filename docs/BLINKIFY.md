# Institutional Blink Demo

Fartnode's Blinkify UI consumes the institutional SOL transfer Action worker,
simulates the transaction first, and lets a user sign/send from their wallet.
The demo defaults to **Solana Devnet**, but any RPC can be supplied via env.

> Always simulate first before sending or sharing the Blink URL.

## Prerequisites

- Node.js `v24.10.0` (see `.nvmrc` if provided) and pnpm `^10`.
- A wallet that supports the Solana Wallet Adapter (Phantom or Solflare are
  bundled).
- Run the Action worker locally or provide a reachable VITE_ACTION_WORKER_URL.

## Run the Worker + Web App

```bash
# 1. Action worker with institutional rails
pnpm -C apps/action-worker dev

# 2. Web UI (requires VITE_ACTION_WORKER_URL in apps/web/.env)
pnpm -C apps/web dev
```

Create `apps/web/.env` from the provided example if needed:

```bash
cp apps/web/.env.example apps/web/.env
```

Then point `VITE_ACTION_WORKER_URL` to your running worker (default: `http://127.0.0.1:8787`).

## Action Endpoints

Transfer metadata:

```bash
curl "$VITE_ACTION_WORKER_URL/api/actions/transfer-sol"
```

Compose (simulate-first):

```bash
curl -X POST "$VITE_ACTION_WORKER_URL/api/actions/transfer-sol" \
  -H "Content-Type: application/json" \
  -d '{"account":"<WALLET_PUBKEY>","recipient":"<RECIPIENT_PUBKEY>","amountSol":0.5}'
```

Expect the Solana Actions `transaction` payload with institutional meta fields
(`meta.priorityFeeMicrolamports`, `meta.blinkUrl`, etc.). The Blink share uses
the `/actions/transfer-sol` URL defined in `actions.json`.

## UI Flow (Screenshots / GIFs)

1. **Connect** Phantom/Solflare via the Wallet Adapter modal.
2. **Fetch metadata** describing the transfer Action schema.
3. **Compose** to fetch the base64 transaction + simulation logs.
4. **Review meta** — priority fee, compute units, blockhash, Blink URL.
5. **Simulate-first** — inspect the log panel before sending.
6. **Sign & send** — capture the signature and open it in Solana Explorer.
7. **Share** the Blink URL surfaced in the compose result.

Record screenshots or a GIF covering connect → POST → simulate logs → sign →
signature links.

## Prod Demo

- **GitHub secrets**: add `CF_API_TOKEN` + `CF_ACCOUNT_ID`, or the Wrangler defaults `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`, under GitHub → Settings → Secrets and variables → Actions.
- **Trigger deploy**: open GitHub Actions → *Deploy Worker* workflow → *Run workflow* (manual dispatch) or push to `main`.
- **Find the worker URL**: copy the `https://<name>.workers.dev` URL from the "Deploy (Wrangler)" step in the workflow logs.
- **Wire the web app**: create/update `apps/web/.env.local` with `VITE_ACTION_WORKER_URL=<your workers.dev URL>` before running `pnpm -C apps/web dev`.

## Notes

- All requests use `ACTIONS_CORS_HEADERS`, enabling cross-origin web demos.
- The worker enforces institutional rails: priority fee bounds, compute budget, blockhash validation, identity memo, and simulation-first responses.
- For production, set mainnet RPC env vars, restrict origins, and plug observability/tip-guard rails as needed.
