import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("../src/rpc.js", () => {
  return {
    selectRpc: vi.fn(),
    getConfiguredCommitment: vi.fn().mockReturnValue("confirmed")
  };
});

const { selectRpc } = await import("../src/rpc.js");
const selectRpcMock = selectRpc as unknown as ReturnType<typeof vi.fn>;

import { estimatePriorityFee } from "../src/fees.js";

describe("estimatePriorityFee", () => {
  const mockConnection = {
    getRecentPrioritizationFees: vi.fn()
  } as unknown as { getRecentPrioritizationFees: (input: unknown) => Promise<unknown[]> };

  beforeEach(() => {
    selectRpcMock.mockResolvedValue(mockConnection);
  });

  afterEach(() => {
    vi.clearAllMocks();
    selectRpcMock.mockReset();
  });

  it("chooses a percentile within provided bounds", async () => {
    mockConnection.getRecentPrioritizationFees = vi.fn().mockResolvedValue([
      { prioritizationFee: 500 },
      { prioritizationFee: 750 },
      { prioritizationFee: 1500 }
    ]);

    const result = await estimatePriorityFee({
      percentile: 75,
      minMicrolamports: 100,
      maxMicrolamports: 1_000_000
    });

    expect(result.p50).toBeGreaterThan(0);
    expect(result.p75).toBeGreaterThanOrEqual(result.p50);
    expect(result.chosen).toBeGreaterThanOrEqual(result.p75);
    expect(result.source).toBe("rpc");
  });

  it("falls back when RPC has no data", async () => {
    mockConnection.getRecentPrioritizationFees = vi.fn().mockResolvedValue([]);

    const result = await estimatePriorityFee({ fallbackMicrolamports: 1234 });
    expect(result.source).toBe("fallback");
    expect(result.chosen).toBe(1234);
  });
});
