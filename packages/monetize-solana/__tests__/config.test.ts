import { describe, expect, it } from "vitest";
import { ensureRouteSpec, loadMonetizeConfig, normalizeRouteKey } from "../src/config.js";

const RECIPIENT = "7Yxhi6sJk6JzEPCc5WEC3j1XPk8WeFyKaqzPvJuhHg1F";

describe("loadMonetizeConfig", () => {
  it("returns null when no config or routes are provided", () => {
    const result = loadMonetizeConfig({
      inlineConfig: undefined,
      env: {}
    });
    expect(result).toBeNull();
  });

  it("merges inline config with env overrides", () => {
    const result = loadMonetizeConfig({
      inlineConfig: {
        recipient: RECIPIENT,
        routes: {
          "post /api/v1/vibe": {
            price: "$0.10"
          }
        },
        facilitatorUrl: "https://example.com/facilitator"
      },
      env: {
        X402_FACILITATOR_URL: "https://override.facilitator",
        X402_NETWORK: "solana"
      }
    });

    expect(result).not.toBeNull();
    expect(result?.recipient).toBe(RECIPIENT);
    expect(result?.facilitatorUrl).toBe("https://override.facilitator");
    expect(result?.routes["POST /api/v1/vibe"].network).toBe("solana");
  });
});

describe("ensureRouteSpec", () => {
  it("applies fallback network when missing", () => {
    const normalized = ensureRouteSpec({ price: "$0.05" }, "solana");
    expect(normalized.network).toBe("solana");
    expect(normalized.price).toBe("$0.05");
  });
});

describe("normalizeRouteKey", () => {
  it("uppercases the method and normalizes slashes", () => {
    const { normalizedKey } = normalizeRouteKey("post api/v1/mint");
    expect(normalizedKey).toBe("POST /api/v1/mint");
  });
});
