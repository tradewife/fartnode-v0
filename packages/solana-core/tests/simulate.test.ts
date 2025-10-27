import { describe, expect, it, vi } from "vitest";
import type { VersionedTransaction } from "@solana/web3.js";

import { SimulationError, simulateAndReport } from "../src/simulate.js";

describe("simulateAndReport", () => {
  it("throws SimulationError when RPC returns an err field", async () => {
    const connection = {
      simulateTransaction: vi.fn().mockResolvedValue({
        value: {
          logs: ["error"],
          err: { InstructionError: [0, "Custom"] }
        }
      })
    } as any;

    await expect(
      simulateAndReport(connection, {} as VersionedTransaction)
    ).rejects.toBeInstanceOf(SimulationError);
  });
});
