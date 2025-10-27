# Program Call Action Blueprint

## Goal
Provide a template for composing arbitrary program instructions via Solana Actions while preserving institutional controls.

## Inputs
- Program ID (checked against allowlist).
- Instruction layout (IDL method name or raw accounts + data).
- Signer/public key initiating the action.
- Optional: account metas, memo, compute preferences.

## Implementation Outline
1. **IDL Awareness**
   - Load Anchor IDL when available; generate instruction data deterministically.
   - Validate accounts against IDL expectations (writable/signers).

2. **Compute + Fees**
   - Call `estimatePriorityFee({ writableAccounts })` for the provided accounts.
   - Apply `computeBudgetIx` to set CU limit + price.

3. **Blockhash Discipline**
   - Acquire `{ blockhash, lastValidBlockHeight } = await getFreshBlockhash({ connection, purpose: "send" })`.
   - Persist `lastValidBlockHeight` in response meta.

4. **Instruction Assembly**
   - Build program instruction using validated metas.
   - Append optional memo + `maybeCreateIdentityMemoInstruction()`.
   - Bundle into `buildVersionedTransaction` with payer = action signer.

5. **Simulation & Reporting**
   - Execute `simulateAndReport`; surface logs + units consumed.
   - On error throw `SimulationError` to prevent blind sends.

6. **Actions Response**
   - Leverage `buildTransactionPostResponse` with `simulateFirst: true`.
   - Add meta: priority fee breakdown, compute limit, blockhash/height, `renderBlinkUrl`, explorer hint, human summary.

## Checklist
- Validate program ID using allowlist or risk engine.
- Ensure no writable PDA is left unsigned.
- Integration tests per program covering success + expected failure (e.g., account missing).
