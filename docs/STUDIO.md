# FARTNODE Vibe Coding Studio
**Flow:** vibe -> choose template -> generate plan -> preview (simulate) -> sign -> share.
- Transfer template: wallet-signed, local simulate.
- Memo/Airdrop templates: composed by Worker and returned as base64 VersionedTransaction.
- **Transfer (Action)**: `POST /api/solana/actions/devnet-transfer` returns a signable VersionedTransaction; simulate-first logs included.
Switch to production by setting `VITE_ACTION_WORKER_URL` to your workers.dev endpoint.
