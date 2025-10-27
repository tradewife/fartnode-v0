import { Hono } from "hono";
import type { Context } from "hono";

import { ACTIONS_CORS_HEADERS, getConnection } from "@fartnode/solana-core";

import {
  composeTransferSol,
  getTransferSolMetadata
} from "./routes/actions/transfer-sol.js";
import { composeSwap, getSwapMetadata } from "./routes/actions/swap.js";

type Bindings = {
  SOLANA_RPC_PRIMARY?: string;
  SOLANA_RPC_URL?: string;
  SOLANA_RPC_FALLBACKS?: string;
  SOLANA_COMMITMENT_READ?: string;
  SOLANA_COMMITMENT_SEND?: string;
  FARTNODE_ACTION_IDENTITY_MEMO?: string;
  FARTNODE_ACTION_IDENTITY_PUBKEY?: string;
  FARTNODE_JITO_URL?: string;
  FARTNODE_JITO_ENABLED?: string;
  JUPITER_BASE_URL?: string;
};

type WorkerContext = Context<{ Bindings: Bindings }>;

const ACTION_RULES = {
  rules: [
    {
      pathPattern: "/actions/transfer-sol",
      apiPath: "/api/actions/transfer-sol"
    },
    {
      pathPattern: "/actions/swap",
      apiPath: "/api/actions/swap"
    }
  ]
};

type JsonStatus = 200 | 400 | 500;

const json = <T>(c: WorkerContext, data: T, status: JsonStatus = 200) =>
  c.json(data, status, ACTIONS_CORS_HEADERS);

const app = new Hono<{ Bindings: Bindings }>();

app.onError((err, c) => {
  console.error("Unhandled worker error", err);
  return json(c as WorkerContext, { error: "Internal Server Error" }, 500);
});

app.use("*", async (c, next) => {
  if (c.req.method === "OPTIONS") {
    return c.body(null, 204, ACTIONS_CORS_HEADERS);
  }
  return next();
});

app.get("/actions.json", (c) => json(c as WorkerContext, ACTION_RULES));

type ActionHandler = {
  path: string;
  get: (origin: string) => unknown;
  post: (params: { body: unknown; connection: Awaited<ReturnType<typeof getConnection>>; origin: string }) => Promise<unknown>;
};

const actionHandlers: ActionHandler[] = [
  {
    path: "/api/actions/transfer-sol",
    get: getTransferSolMetadata,
    post: composeTransferSol as ActionHandler["post"]
  },
  {
    path: "/api/actions/swap",
    get: getSwapMetadata,
    post: composeSwap as ActionHandler["post"]
  }
];

const getOrigin = (url: string): string => {
  const parsed = new URL(url);
  return parsed.origin;
};

for (const { path, get, post } of actionHandlers) {
  app.get(path, async (c) => {
    try {
      const origin = getOrigin(c.req.url);
      return json(c as WorkerContext, get(origin));
    } catch (error) {
      console.warn(`Metadata handler failed for ${path}`, error);
      return json(c as WorkerContext, { error: "Unable to build metadata" }, 500);
    }
  });

  app.post(path, async (c) => {
    try {
      const origin = getOrigin(c.req.url);
      const body = await c.req.json();
      const connection = await getConnection(undefined, undefined, "send");
      const payload = await post({
        body,
        connection,
        origin
      });
      return json(c as WorkerContext, payload);
    } catch (error) {
      console.warn(`Action handler failed for ${path}`, error);
      const message =
        error instanceof Error && error.message ? error.message : "Unable to compose transaction";
      return json(c as WorkerContext, { error: message }, 400);
    }
  });
}

export default app;
