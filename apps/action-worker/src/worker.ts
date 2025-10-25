import { Hono } from "hono";
import type { ComposeResult } from "@fartnode/solana-core";

import {
  composeDevnetAirdrop,
  getDevnetAirdropMetadata
} from "./routes/solana/devnet-airdrop.js";

type Bindings = {
  SOLANA_RPC_URL?: string;
  IDEMPOTENCY_KV?: KVNamespace;
};

const IDEMPOTENCY_TTL = 60 * 60; // seconds
const RATE_LIMIT_WINDOW_MS = 3_000;
const rateLimitCache = new Map<string, number>();
const memoryIdempotency = new Map<string, ComposeResult>();

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Idempotency-Key"
} as const;

const allowRequest = (identifier: string): boolean => {
  const now = Date.now();
  const last = rateLimitCache.get(identifier) ?? 0;

  if (now - last < RATE_LIMIT_WINDOW_MS) {
    return false;
  }

  rateLimitCache.set(identifier, now);
  return true;
};

const loadIdempotentResponse = async (
  env: Bindings,
  key: string
): Promise<ComposeResult | null> => {
  if (env.IDEMPOTENCY_KV) {
    const stored = await env.IDEMPOTENCY_KV.get<ComposeResult>(key, {
      type: "json"
    });
    return stored ?? null;
  }

  return memoryIdempotency.get(key) ?? null;
};

const persistIdempotentResponse = async (
  env: Bindings,
  key: string,
  value: ComposeResult
): Promise<void> => {
  if (env.IDEMPOTENCY_KV) {
    await env.IDEMPOTENCY_KV.put(key, JSON.stringify(value), {
      expirationTtl: IDEMPOTENCY_TTL
    });
    return;
  }

  memoryIdempotency.set(key, value);
};

const app = new Hono<{ Bindings: Bindings }>();

app.onError((err, c) => {
  console.error("Unhandled worker error", err);
  return c.json({ error: "Internal Server Error" }, 500, CORS_HEADERS);
});

app.use("*", async (c, next) => {
  await next();
  for (const [name, value] of Object.entries(CORS_HEADERS)) {
    c.res.headers.set(name, value);
  }
});

app.options("*", (c) => {
  return c.body(null, 204, CORS_HEADERS);
});

app.get("/api/solana/devnet-airdrop", (c) => {
  return c.json(getDevnetAirdropMetadata());
});

app.post("/api/solana/devnet-airdrop", async (c) => {
  const clientId = c.req.header("CF-Connecting-IP") ?? "anonymous";
  if (!allowRequest(clientId)) {
    return c.json({ error: "Rate limit exceeded" }, 429);
  }

  const idempotencyKey = c.req.header("Idempotency-Key") ?? undefined;
  if (idempotencyKey) {
    const cached = await loadIdempotentResponse(c.env, idempotencyKey);
    if (cached) {
      return c.json(cached);
    }
  }

  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (typeof payload !== "object" || payload === null) {
    return c.json({ error: "Request body must be an object" }, 400);
  }

  try {
    const result = await composeDevnetAirdrop({
      rpcUrl: c.env.SOLANA_RPC_URL,
      input: payload as any
    });

    if (idempotencyKey) {
      await persistIdempotentResponse(c.env, idempotencyKey, result);
    }

    return c.json(result);
  } catch (error) {
    console.warn("Devnet airdrop composition failed", error);
    return c.json({ error: (error as Error).message ?? "Unknown error" }, 400);
  }
});

export default app;
