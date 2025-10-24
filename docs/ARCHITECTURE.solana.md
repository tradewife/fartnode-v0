## Solana Architecture Notes

- **Routing seam** — Solana Actions live under `apps/action-worker` (Cloudflare Worker). The `vibesdk` git submodule remains a reference/templates source and is not modified by default.
- **Core helpers** — Shared logic for Solana RPC, compute budget, and transaction composition is published from `packages/solana-core`.
- **Network scope** — Devnet/Testnet defaults only; no mainnet commitments are made without explicit configuration.
- **Security model** — The worker operates statelessly with no secrets. All payloads require client-side simulation (`simulateFirst: true`) before broadcast. Idempotency uses the `Idempotency-Key` header; Durable Object/KV storage is optional but recommended. A simple rate-limit placeholder is included to discourage bursts.
- **Extensibility** — Additional Actions should plug into the worker router via `src/routes/<namespace>` while reusing exports from `@fartnode/solana-core`.
