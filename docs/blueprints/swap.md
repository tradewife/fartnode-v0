# Jupiter Swap Action Blueprint

## Objective
Compose a Solana Action that fetches a Jupiter quote, builds the swap transaction, simulates it, and returns a Blink-ready payload.

## Key Steps
1. **Read configuration**
   - Load RPC endpoints from `SOLANA_RPC_PRIMARY` + `SOLANA_RPC_FALLBACKS`.
   - Optional: `JUPITER_BASE_URL` override.

2. **Quote**
   - Call `fetchJupiterQuote({ inputMint, outputMint, amount, slippageBps })`.
   - Validate that `amount` is in base units (no decimals).

3. **Fee Discipline**
   - Invoke `estimatePriorityFee({ writableAccounts: [userPubkey] })`.
   - Derive `[limitIx, priceIx] = computeBudgetIx({ cuLimit, cuPriceMicrolamports: estimates.chosen })`.

4. **Build & Harden Transaction**
   - Use `buildJupiterSwapTransaction({ quoteResponse, userPublicKey, connection, computeUnitPriceMicroLamports: estimates.chosen })`.
   - Refresh blockhash with `getFreshBlockhash({ connection })`; set `tx.message.recentBlockhash` and store `lastValidBlockHeight`.
   - Append identity memo using `maybeCreateIdentityMemoInstruction()` and optional user memo.
   - Prepend compute budget instructions (`limitIx`, `priceIx`).

5. **Simulate**
   - Run `simulateAndReport(connection, tx)`; abort on `SimulationError`.

6. **Respond**
   - Wrap with `buildTransactionPostResponse({ transaction: tx, message, simulationLogs })`.
   - Add metadata: priority fee, compute units, blockhash, `renderBlinkUrl(...)`, explorer hint.
   - Return JSON matching the Actions spec + institutional meta.

## Testing Checklist
- Unit test quote fallbacks (mock Jupiter + RPC).
- Assert `simulateFirst` is `true`.
- Verify `lastValidBlockHeight` included in response meta.
- Exercise error path when simulation fails.
