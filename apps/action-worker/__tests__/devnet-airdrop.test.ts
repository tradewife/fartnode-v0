import { Buffer } from "node:buffer";

import { describe, expect, it, vi } from "vitest";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";

import { composeDevnetAirdrop } from "../src/routes/solana/devnet-airdrop.js";

const MOCK_BLOCKHASH = "11111111111111111111111111111111";
const RECIPIENT = new PublicKey("11111111111111111111111111111111");
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

describe("composeDevnetAirdrop", () => {
  it("returns a signable transaction with memo instruction and simulation logs", async () => {
    const requestAirdrop = vi.fn().mockResolvedValue("mock-signature");
    const getLatestBlockhash = vi.fn().mockResolvedValue({
      blockhash: MOCK_BLOCKHASH,
      lastValidBlockHeight: 123
    });
    const simulateTransaction = vi.fn().mockResolvedValue({
      value: {
        logs: ["memo invoked"],
        err: null
      }
    });

    const result = await composeDevnetAirdrop({
      input: {
        publicKey: RECIPIENT.toBase58(),
        amountSol: 1
      },
      connection: {
        requestAirdrop,
        getLatestBlockhash,
        simulateTransaction
      } as unknown as Connection
    });

    expect(result.transaction).toBeTypeOf("string");
    expect(result.transaction.length).toBeGreaterThan(0);
    expect(result.network).toBe("devnet");
    expect(result.simulateFirst).toBe(true);
    expect(result.message).toContain("Simulate");
    expect(result.simulationLogs).toEqual(["memo invoked"]);

    const decoded = VersionedTransaction.deserialize(Buffer.from(result.transaction, "base64"));
    expect(decoded).toBeInstanceOf(VersionedTransaction);
    expect(decoded.signatures.length).toBe(1);

    const accountKeys = decoded.message.getAccountKeys({
      accountKeysFromLookups: {
        writable: [],
        readonly: []
      }
    });

    const memoFound = decoded.message.compiledInstructions.some((ix) => {
      const programId = accountKeys.get(ix.programIdIndex);
      return programId?.equals(MEMO_PROGRAM_ID);
    });

    expect(memoFound).toBe(true);

    expect(requestAirdrop).toHaveBeenCalledWith(RECIPIENT, 1_000_000_000);
    expect(simulateTransaction).toHaveBeenCalled();
  });
});
