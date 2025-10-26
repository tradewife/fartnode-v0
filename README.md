# 🌀 FARTNODE — The Solana Vibe Coding Platform

FARTNODE is a **Solana-native developer platform** that removes friction from building and deploying decentralized apps.  
It turns creative intent — *a vibe, an idea, a sentence* — into **ready-to-deploy Solana projects** using secure, auditable Actions and composable templates.

## 🌈 What It Does

- **Vibe Coding Engine** — Translate natural-language or visual prompts into runnable Solana codebases using modular templates (Anchor, Blink, Worker).
- **Instant Dev Environments** — Bootstraps a fully-typed workspace with wallet flows, compute tuning, and Solana actions pre-wired.
- **Live Blink Actions** — Every generated feature becomes a *shareable, signable Solana Action* — so developers and communities can test instantly.
- **Deploy at Speed** — Push from prototype to production in one click via Cloudflare Workers; everything runs on real Solana infrastructure.
- **Secure by Design** — Simulate-first, no private keys exposed, always wallet-signed.

## ⚡ Current Build (Cypherpunk Edition)

| Component | Description |
|------------|-------------|
| **solana-core** | Type-safe primitives for compute budgets, priority fees, simulation, and versioned transactions. |
| **action-worker** | Cloudflare Worker that composes and serves live Solana Actions / Blinks. |
| **Blinkify UI** | Front-end demo where builders connect wallets, generate, simulate, and sign on-chain Actions. |
| **Vibe Templates (coming)** | Plug-and-play starter kits — DeFi, GameFi, NFT mint, on-chain agents — ready to remix. |

## 💡 Why It Matters

Solana is fast — but building on it still isn’t.  
FARTNODE closes that gap. We empower every builder, artist, and dev with **institutional-grade tooling and human-grade creativity**.

> From *vibe* → to *code* → to *live Solana app*.

## 🚀 Try It Locally

```bash
pnpm -C apps/action-worker dev
pnpm -C apps/web dev
# connect your Phantom wallet
```

## Optional Monetization Kit

FARTNODE ships an opt-in Solana monetization toolkit for creators who want to charge for routes or MCP tools:

- `packages/monetize-solana` — x402 helpers for Hono Workers and MCP servers.
- `examples/solana-devnet-workers` — Cloudflare Worker showcasing paid Solana endpoints.
- `examples/mcp-paid-tools` — Streamable HTTP MCP server with paid and free tools.

See `docs/monetization.md` for setup guidance and facilitator details.
