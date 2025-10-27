import { Hono } from "hono";
import type { Context } from "hono";

import {
  ACTIONS_CORS_HEADERS,
  SimulationError,
  buildVersionedTransaction,
  computeBudgetIx,
  estimatePriorityFee,
  getConnection,
  getFreshBlockhash,
  maybeCreateIdentityMemoInstruction,
  serializeTransactionBase64,
  simulateFirst
} from "@fartnode/solana-core";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";

import {
  composeTransferSol,
  getTransferSolMetadata
} from "./routes/actions/transfer-sol.js";
import { composeSwap, getSwapMetadata } from "./routes/actions/swap.js";

type Bindings = {
  SOLANA_RPC_PRIMARY?: string;
  SOLANA_RPC_URL?: string;
  SOLANA_RPC_DEVNET?: string;
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

class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const DEVNET_COMPUTE_UNIT_LIMIT = 200_000;
const DEVNET_TRANSFER_MESSAGE = "Simulate before signing in your wallet.";

const textEncoder = new TextEncoder();

const parsePublicKey = (value: unknown, field: string): PublicKey => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BadRequestError(`${field} is required`);
  }

  try {
    return new PublicKey(value);
  } catch {
    throw new BadRequestError(`${field} is not a valid Solana public key`);
  }
};

const parseAmountSol = (value: unknown): number => {
  const normalized =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;

  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new BadRequestError("amountSol must be a positive number");
  }

  return normalized;
};

const createMemoInstruction = (memo: string): TransactionInstruction => {
  const trimmed = memo.trim();
  if (trimmed.length === 0) {
    throw new BadRequestError("memo cannot be empty");
  }
  const bytes = textEncoder.encode(trimmed);
  const maybeBuffer = (globalThis as typeof globalThis & {
    Buffer?: { from(input: Uint8Array): Uint8Array };
  }).Buffer;
  const data = maybeBuffer ? maybeBuffer.from(bytes) : bytes;

  return new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [],
    data
  } as any);
};

const resolveDevnetRpcEndpoint = (env: Bindings | undefined): string | undefined => {
  if (!env) {
    return undefined;
  }

  if (env.SOLANA_RPC_DEVNET) {
    return env.SOLANA_RPC_DEVNET;
  }

  if (env.SOLANA_RPC_URL && /devnet/i.test(env.SOLANA_RPC_URL)) {
    return env.SOLANA_RPC_URL;
  }

  if (env.SOLANA_RPC_PRIMARY && /devnet/i.test(env.SOLANA_RPC_PRIMARY)) {
    return env.SOLANA_RPC_PRIMARY;
  }

  return undefined;
};

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

app.post("/api/solana/actions/devnet-transfer", async (c) => {
  try {
    const payload = await c.req.json();
    if (typeof payload !== "object" || payload === null) {
      throw new BadRequestError("Request body must be a JSON object");
    }

    const body = payload as Record<string, unknown>;
    const sender = parsePublicKey(body.publicKey, "publicKey");
    const recipient = parsePublicKey(body.recipient, "recipient");
    const amountSol = parseAmountSol(body.amountSol);
    const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);
    if (lamports <= 0) {
      throw new BadRequestError("Transfer amount is too small");
    }

    const userMemo =
      typeof body.memo === "string" && body.memo.trim().length > 0
        ? body.memo
        : undefined;

    const rpcOverride = resolveDevnetRpcEndpoint(c.env) ?? "https://api.devnet.solana.com";
    const connection = await getConnection(rpcOverride, undefined, "send");

    const priorityFee = await estimatePriorityFee({
      writableAccounts: [sender.toBase58(), recipient.toBase58()]
    });

    const [computeLimitIx, computePriceIx] = computeBudgetIx({
      cuLimit: DEVNET_COMPUTE_UNIT_LIMIT,
      cuPriceMicrolamports: priorityFee.chosen
    });

    const transferIx = SystemProgram.transfer({
      fromPubkey: sender,
      toPubkey: recipient,
      lamports
    });

    const identityMemoIx = maybeCreateIdentityMemoInstruction();
    const memoIx = userMemo ? createMemoInstruction(userMemo) : null;

    const { blockhash } = await getFreshBlockhash({
      connection,
      purpose: "send"
    });

    const instructions: TransactionInstruction[] = [
      computeLimitIx,
      computePriceIx,
      transferIx
    ];

    if (identityMemoIx) {
      instructions.push(identityMemoIx);
    }

    if (memoIx) {
      instructions.push(memoIx);
    }

    const transaction = buildVersionedTransaction({
      payer: sender,
      instructions,
      blockhash
    });

    let simulationLogs: string[] | undefined;
    try {
      const simulation = await simulateFirst(connection, transaction);
      simulationLogs = simulation.logs;
    } catch (simulationError) {
      if (simulationError instanceof SimulationError) {
        simulationLogs = simulationError.logs;
        console.warn("devnet-transfer simulation failed", simulationError);
      } else {
        console.warn("devnet-transfer simulation failed", simulationError);
      }
    }

    return json(c as WorkerContext, {
      transaction: serializeTransactionBase64(transaction),
      network: "devnet",
      simulateFirst: true,
      message: DEVNET_TRANSFER_MESSAGE,
      simulationLogs
    });
  } catch (error) {
    console.warn("devnet-transfer handler failed", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status: JsonStatus = error instanceof BadRequestError ? 400 : 500;
    return json(c as WorkerContext, { error: message }, status);
  }
});

export default app;
