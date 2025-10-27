import { describe, expect, it, vi } from "vitest";
import { Keypair, SystemProgram, TransactionInstruction } from "@solana/web3.js";

vi.mock("@fartnode/solana-core", async () => {
  const actual = await vi.importActual<any>("@fartnode/solana-core");
  return {
    ...actual,
    estimatePriorityFee: vi.fn().mockResolvedValue({
      p50: 1000,
      p75: 2000,
      chosen: 2500,
      source: "rpc"
    }),
    getFreshBlockhash: vi.fn().mockResolvedValue({
      blockhash: "FRESH_BLOCKHASH",
      lastValidBlockHeight: 123,
      commitment: "confirmed",
      endpoint: "https://rpc"
    }),
    simulateAndReport: vi.fn().mockResolvedValue({ logs: ["ok"], err: null })
  };
});

import * as SolanaCore from "@fartnode/solana-core";
import { composeTransferSol } from "../src/routes/actions/transfer-sol.js";

describe("composeTransferSol", () => {
  it("returns an action payload with metadata", async () => {
    const connection = {
      getLatestBlockhash: vi.fn(),
      getBlockHeight: vi.fn().mockResolvedValue(100)
    } as any;

    const sender = Keypair.generate().publicKey;
    const recipient = Keypair.generate().publicKey;

    const computeSpy = vi.spyOn(SolanaCore, "computeBudgetIx").mockReturnValue([
      new TransactionInstruction({ programId: SystemProgram.programId, keys: [], data: Buffer.alloc(0) }),
      new TransactionInstruction({ programId: SystemProgram.programId, keys: [], data: Buffer.alloc(0) })
    ]);

    const renderSpy = vi.spyOn(SolanaCore, "renderBlinkUrl").mockReturnValue("https://blink");
    const postSpy = vi
      .spyOn(SolanaCore, "buildTransactionPostResponse")
      .mockResolvedValue({ transaction: "BASE64", type: "transaction", simulateFirst: true });

    const result = await composeTransferSol({
      body: {
        account: sender.toBase58(),
        recipient: recipient.toBase58(),
        amountSol: 0.5
      },
      connection,
      origin: "https://demo"
    });

    expect(postSpy).toHaveBeenCalled();
    expect(result.meta?.priorityFeeMicrolamports).toBe(2500);
    expect(result.meta?.blinkUrl).toBe("https://blink");
    expect(result.meta?.blockhash).toBe("FRESH_BLOCKHASH");

    computeSpy.mockRestore();
    renderSpy.mockRestore();
    postSpy.mockRestore();
  });
});
