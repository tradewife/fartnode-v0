import { describe, expect, it } from "vitest";

import { isBlockhashValid } from "../src/blockhash.js";

const mockConnection = {
  getBlockHeight: async () => 0
} as any;

describe("blockhash validation", () => {
  it("returns true when block height plus buffer is below last valid height", async () => {
    const valid = await isBlockhashValid("hash", 120, {
      connection: mockConnection,
      currentBlockHeight: 100
    });
    expect(valid).toBe(true);
  });

  it("returns false when height exceeds last valid block height", async () => {
    const valid = await isBlockhashValid("hash", 100, {
      connection: mockConnection,
      currentBlockHeight: 100
    });
    expect(valid).toBe(false);
  });
});
