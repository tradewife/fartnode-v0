import { afterEach, describe, expect, it, vi } from "vitest";
import type { Hono } from "hono";
import { registerPaid, withFartnodeX402 } from "../src/hono.js";

type MiddlewareSpy = (payTo: string, routes: Record<string, unknown>, facilitator?: unknown) => unknown;
const paymentMiddlewareSpy = vi.hoisted(() =>
  vi.fn<Parameters<MiddlewareSpy>, ReturnType<MiddlewareSpy>>(() => "mw")
);

vi.mock("x402-hono", () => ({
  paymentMiddleware: paymentMiddlewareSpy
}));

afterEach(() => {
  paymentMiddlewareSpy.mockClear();
});

describe("withFartnodeX402", () => {
  it("registers payment middleware when monetization is configured", () => {
    const use = vi.fn();
    const app = { use } as unknown as Hono;

    withFartnodeX402(app, {
      recipient: "7Yxhi6sJk6JzEPCc5WEC3j1XPk8WeFyKaqzPvJuhHg1F",
      routes: {
        "get /paid": {
          price: "$0.10",
          network: "solana-devnet"
        }
      }
    });

    expect(paymentMiddlewareSpy).toHaveBeenCalledTimes(1);
    expect(use).toHaveBeenCalledWith("mw");
  });

  it("allows registering additional paid routes at runtime", () => {
    const use = vi.fn();
    const app = { use } as unknown as Hono;

    withFartnodeX402(app, {
      recipient: "7Yxhi6sJk6JzEPCc5WEC3j1XPk8WeFyKaqzPvJuhHg1F",
      routes: {
        "get /initial": {
          price: "$0.01",
          network: "solana-devnet"
        }
      }
    });

    registerPaid(app, "post /dynamic", {
      price: "$0.25",
      network: "solana-devnet"
    });

    expect(paymentMiddlewareSpy).toHaveBeenCalled();

    const firstCall = paymentMiddlewareSpy.mock.calls[0]!;
    const routesConfig = firstCall[1] as Record<string, unknown> | undefined;
    expect(routesConfig).toBeDefined();
    if (!routesConfig) {
      throw new Error("routesConfig should be defined after withFartnodeX402");
    }
    const typedConfig = routesConfig as Record<string, unknown>;
    expect(typedConfig["GET /initial"]).toBeDefined();
    expect(typedConfig["POST /dynamic"]).toBeDefined();
  });
});
