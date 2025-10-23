# Fartnode Solana Architecture

## Overview
- Fartnode pairs the Cloudflare VibeSDK workspace (`vibesdk/`) with curated Solana program templates to turn natural-language prompts into deployable Actions, Blinks, and Anchor programs.
- Front-of-house traffic lands in the Worker bundle, which orchestrates simulation, signing, and export flows while delegating deterministic work to Durable Objects and D1.
- Anchor-based templates (see `vibesdk/templates/anchor/*`) provide reference programs that can be cloned, parameterised, and regenerated through the agent flow, keeping Solana logic versioned alongside the Worker client.

## Routing Seam
- **Inbound UX:** React+Vite UI and API requests terminate in the Worker. The Worker exposes Solana Actions (GET metadata, POST transaction composer) that downstream wallets/Blinks consume ([Cookbook: Connect to a Solana environment](https://solana.com/cookbook/development/connect-environment?utm_source=llms&utm_medium=ai&utm_campaign=txt)).
- **Worker ↔ Program:** The Worker packages versioned transactions with priority fee presets, runs `simulateTransaction` first, then forwards signed payloads to the Solana RPC tier.
- **Outbound Telemetry:** Durable Objects capture simulation traces and error surfaces which the UI renders as part of the “simulate-first” experience.

## Security Model
- **Account Validation:** Anchor templates ship with strict `Accounts` contexts (signer, owner, PDA seeds) following [Solana Program Security](https://solana.com/courses/program-security/?utm_source=llms&utm_medium=ai&utm_campaign=txt) guidance.
- **Key Management:** Hot keys never leave the Worker boundary; signing happens in user wallets or server-held custodial key scopes protected via environment secrets.
- **Replay / Rate Control:** Action POST handlers enforce idempotency keys, signature expiration, and minimum compute budget to resist replay attacks.
- **Observability:** All privileged routes log to Durable Object storage with redaction, allowing anomaly detection without leaking secrets.
