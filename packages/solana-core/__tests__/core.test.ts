import { describe, expect, it, vi } from "vitest";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";

import {
  type ActionMetadata,
  type ComposeInput,
  buildVersionedTransaction,
  serializeTransactionBase64,
  simulateFirst
} from "../index.js";

const mockBlockhash = "11111111111111111111111111111111";
const mockPayer = new PublicKey("11111111111111111111111111111111");

describe("solana-core", () => {
  it("provides valid metadata and compose input shapes", () => {
    const metadata: ActionMetadata = {
      title: "Devnet Airdrop",
      description: "Request SOL on devnet and return a versioned transaction.",
      inputs: [
        { name: "publicKey", type: "string", required: true },
        { name: "amountSol", type: "number", required: false, default: 1 }
      ]
    };

    const composeInput: ComposeInput = {
      publicKey: mockPayer.toBase58(),
      amountSol: 1.5
    };

    expect(metadata.title).toBe("Devnet Airdrop");
    expect(metadata.description.length).toBeGreaterThan(0);
    expect(metadata.inputs).toHaveLength(2);
    expect(metadata.inputs[0]).toMatchObject({
      name: "publicKey",
      type: "string",
      required: true
    });
    expect(composeInput.publicKey).toBe(mockPayer.toBase58());
  });

  it("buildVersionedTransaction composes a VersionedTransaction and serializes", () => {
    const tx = buildVersionedTransaction({
      payer: mockPayer,
      instructions: [],
      blockhash: mockBlockhash
    });

    expect(tx).toBeInstanceOf(VersionedTransaction);
    expect(tx.message.recentBlockhash).toBe(mockBlockhash);

    const base64 = serializeTransactionBase64(tx);
    expect(typeof base64).toBe("string");
    expect(base64.length).toBeGreaterThan(0);

    const decoded = VersionedTransaction.deserialize(Buffer.from(base64, "base64"));
    expect(decoded).toBeInstanceOf(VersionedTransaction);
    expect(decoded.signatures.length).toBeGreaterThan(0);
  });

  it("simulateFirst returns logs and err data from connection", async () => {
    const tx = buildVersionedTransaction({
      payer: mockPayer,
      instructions: [],
      blockhash: mockBlockhash
    });

    const simulateTransaction = vi.fn().mockResolvedValue({
      value: {
        logs: ["log 1", "log 2"],
        err: null
      }
    });

    const mockConnection = {
      simulateTransaction
    } as unknown as Parameters<typeof simulateFirst>[0];

    const result = await simulateFirst(mockConnection, tx, {
      commitment: "processed",
      replaceRecentBlockhash: false,
      sigVerify: true
    });

    expect(simulateTransaction).toHaveBeenCalledWith(tx, {
      sigVerify: true,
      replaceRecentBlockhash: false,
      commitment: "processed"
    });
    expect(result.logs).toEqual(["log 1", "log 2"]);
    expect(result.err).toBeNull();
  });
});
