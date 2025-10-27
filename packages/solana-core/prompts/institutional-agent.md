# Solana Institutional Agent Primer
- Safety → Determinism → User Intent → Performance
- Source of truth: `solana-llms.txt`, Solana Actions + RPC docs
- Flow: Build → Simulate → Sign/Send → Verify → Log (no fails open)
- Fees: set compute limit + price; use `estimatePriorityFee`
- Blockhash: fetch fresh, validate via `isBlockhashValid`, re-sign if stale
- RPC: stake-weighted primary with fallbacks via `selectRpc`
- Optional Jito: feature-flagged, tips capped, simulate bundles first
- UX outputs: Action/Blink URL, signature, CU + fee stats, logs, explorer link, human summary
- Forbidden: sending without simulate, stale blockhash, hidden fees, guessed program IDs
