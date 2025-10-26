# Blinkify Devnet Demo

Fartnode's Blinkify UI consumes the devnet airdrop Action worker, simulates the
transaction first, and lets a user sign/send from their wallet. The demo runs
entirely against **Solana Devnet**.

> Devnet only — always simulate first before sending or sharing the Blink URL.

## Prerequisites

- Node.js `v24.10.0` (see `.nvmrc` if provided) and pnpm `^10`.
- A wallet that supports the Solana Wallet Adapter (Phantom or Solflare are
  bundled).
- Run the Action worker locally or provide a reachable VITE_ACTION_WORKER_URL.

## Run the Worker + Web App

```bash
# 1. Action worker with devnet credentials
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

Metadata:

```bash
curl "$VITE_ACTION_WORKER_URL/api/solana/actions/devnet-airdrop"
```

Compose (simulate-first):

```bash
curl -X POST "$VITE_ACTION_WORKER_URL/api/solana/actions/devnet-airdrop" \
  -H "Content-Type: application/json" \
  -d '{"publicKey":"<DEVNET_PUBLIC_KEY>","amountSol":1}'
```

Expect `{ transaction, message, simulateFirst, simulationLogs? }`. The Blink
share surfaces the `POST` endpoint directly.

## UI Flow (Screenshots / GIFs)

1. **Connect** Phantom/Solflare on devnet via the Wallet Adapter modal.
2. **Fetch metadata** and adjust the optional amount (ignored by the placeholder).
3. **Compose** to fetch the base64 transaction + simulation logs.
4. **Simulate-first** — review logs in the expandable panel.
5. **Sign & send** — capture the signature and open it in Solana Explorer or
   SolanaFM (devnet cluster).
6. **Share** the Blink URL from the UI panel.

Record screenshots or a GIF covering connect → POST → simulate logs → sign →
signature links.

## Prod Demo

- **GitHub secrets**: add `CF_API_TOKEN` + `CF_ACCOUNT_ID`, or the Wrangler defaults `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`, under GitHub → Settings → Secrets and variables → Actions.
- **Trigger deploy**: open GitHub Actions → *Deploy Worker* workflow → *Run workflow* (manual dispatch) or push to `main`.
- **Find the worker URL**: copy the `https://<name>.workers.dev` URL from the "Deploy (Wrangler)" step in the workflow logs.
- **Wire the web app**: create/update `apps/web/.env.local` with `VITE_ACTION_WORKER_URL=<your workers.dev URL>` before running `pnpm -C apps/web dev`.

## Notes

- All requests use CORS (`Access-Control-Allow-Origin: *`), enabling cross-origin web demos.
- The demo clamps amounts server-side to safe devnet values and logs simulation output before prompting for signatures.
- For production, swap Devnet endpoints, restrict origins, and add analytics/observability as needed.
