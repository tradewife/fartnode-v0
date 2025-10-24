import { describe, expect, it, vi } from "vitest";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";

import {
  ActionMetadata,
  buildVersionedTx,
  simulateFirst
} from "../index.js";

const mockBlockhash = "11111111111111111111111111111111";
const mockPayer = new PublicKey("11111111111111111111111111111111");

describe("solana-core", () => {
  it("provides valid metadata shape", () => {
    const metadata: ActionMetadata = {
      title: "Devnet Airdrop",
      description: "Request SOL on devnet and return a versioned transaction.",
      inputs: [
        { name: "publicKey", type: "string", required: true },
        { name: "amountSol", type: "number", required: false, default: 1 }
      ]
    };

    expect(metadata.title).toBe("Devnet Airdrop");
    expect(metadata.description.length).toBeGreaterThan(0);
    expect(metadata.inputs).toHaveLength(2);
    expect(metadata.inputs[0]).toMatchObject({
      name: "publicKey",
      type: "string",
      required: true
    });
  });

  it("buildVersionedTx composes a VersionedTransaction", () => {
    const tx = buildVersionedTx({
      payer: mockPayer,
      ixs: [],
      blockhash: mockBlockhash
    });

    expect(tx).toBeInstanceOf(VersionedTransaction);
    expect(tx.message.recentBlockhash).toBe(mockBlockhash);
  });

  it("simulateFirst returns logs and err data from connection", async () => {
    const tx = buildVersionedTx({
      payer: mockPayer,
      ixs: [],
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

    const result = await simulateFirst(mockConnection, tx);

    expect(simulateTransaction).toHaveBeenCalledWith(tx, {
      sigVerify: false,
      replaceRecentBlockhash: true
    });
    expect(result.logs).toEqual(["log 1", "log 2"]);
    expect(result.err).toBeUndefined();
  });
});
