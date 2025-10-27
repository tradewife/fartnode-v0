# Mint NFT Action Blueprint

## Objective
Expose a no-code Solana Action that prepares a single NFT mint (supply 1) with configurable metadata while enforcing institutional rails.

## Flow
1. **Validate input**
   - Required: creator address, name, symbol, URI.
   - Optional: royalty bps, memo string.
   - Reject unknown program IDs.

2. **Setup**
   - Resolve RPC connection via `selectRpc(getConfiguredCommitment("read"), "read")`.
   - Fetch `lastValidBlockHeight` using `getFreshBlockhash({ connection, purpose: "send" })`.

3. **Accounts & Instructions**
   - Derive mint + associated token account addresses.
   - Build SPL Token + Metadata instructions.
   - Prepend compute instructions from `computeBudgetIx({ cuLimit, cuPriceMicrolamports })` (priority fee from `estimatePriorityFee`).
   - Append `maybeCreateIdentityMemoInstruction()` and optional user memo.

4. **Assemble Transaction**
   - Use `buildVersionedTransaction({ payer, instructions, blockhash })`.
   - Inject lookup tables if needed.

5. **Simulation**
   - Execute `simulateAndReport(connection, tx)`; throw on `SimulationError`.
   - Capture compute consumption + logs for response meta.

6. **Response Payload**
   - Encode via `buildTransactionPostResponse`. Set `simulateFirst: true`.
   - Include meta: `priorityFeeMicrolamports`, `computeUnitLimit`, `blockhash`, `lastValidBlockHeight`, `renderBlinkUrl` output, explorer hint template.

## Safety Notes
- Never auto-create PDAs without deterministic seeds.
- Reject royalty > 10000 bps.
- Enforce BYOK: no private key handling.

## Testing
- Unit tests for metadata validation + royalty bounds.
- Mock simulation failure to ensure fail-closed behavior.
- Snapshot response meta to guarantee institutional fields.
