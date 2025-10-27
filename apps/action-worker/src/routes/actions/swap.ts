import {
  ACTIONS_CORS_HEADERS,
  buildActionGetResponse,
  buildTransactionPostResponse,
  computeBudgetIx,
  connectionToExplorerUrl,
  estimatePriorityFee,
  fetchJupiterQuote,
  buildJupiterSwapTransaction,
  getConnection,
  getFreshBlockhash,
  maybeCreateIdentityMemoInstruction,
  renderBlinkUrl,
  simulateAndReport
} from "@fartnode/solana-core";
import {
  AddressLookupTableAccount,
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction
} from "@solana/web3.js";

const ACTION_PATH = "/api/actions/swap";
const BLINK_PATH = "/actions/swap";
const ACTION_LABEL = "Swap via Jupiter";
const ICON_URL = "https://www.jup.ag/favicon.ico";
const DEFAULT_COMPUTE_UNIT_LIMIT = 1_000_000;

type SwapRequestBody = {
  account?: string;
  amount?: number;
  inputMint?: string;
  outputMint?: string;
  slippageBps?: number;
  memo?: string;
};

const parsePubkey = (value: string | undefined, field: string): PublicKey => {
  if (!value) {
    throw new Error(`${field} is required`);
  }
  try {
    return new PublicKey(value);
  } catch {
    throw new Error(`${field} is not a valid public key`);
  }
};

const parseAmount = (amount: SwapRequestBody["amount"]): number => {
  if (!Number.isFinite(amount) || !amount || amount <= 0) {
    throw new Error("amount must be a positive number");
  }
  return Math.floor(amount);
};

const encodeMemoInstruction = (memo: string): TransactionInstruction => {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(memo);
  const maybeBuffer = (globalThis as typeof globalThis & {
    Buffer?: { from(data: Uint8Array): Uint8Array };
  }).Buffer;
  const data = maybeBuffer ? maybeBuffer.from(bytes) : bytes;
  return new TransactionInstruction({
    programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
    keys: [],
    data
  } as any);
};

const fetchLookupAccounts = async (
  connection: Connection,
  tx: VersionedTransaction
): Promise<AddressLookupTableAccount[]> => {
  if (tx.version !== 0 || tx.message.addressTableLookups.length === 0) {
    return [];
  }

  const accounts: AddressLookupTableAccount[] = [];
  for (const lookup of tx.message.addressTableLookups) {
    const { value } = await connection.getAddressLookupTable(lookup.accountKey);
    if (!value) {
      throw new Error(`Failed to load address lookup table ${lookup.accountKey.toBase58()}`);
    }
    accounts.push(value);
  }
  return accounts;
};

const appendInstructions = async (
  connection: Connection,
  tx: VersionedTransaction,
  newInstructions: TransactionInstruction[],
  position: "append" | "prepend" = "append"
): Promise<VersionedTransaction> => {
  if (newInstructions.length === 0) {
    return tx;
  }

  const lookupAccounts = await fetchLookupAccounts(connection, tx);
  const message = TransactionMessage.decompile(tx.message, {
    addressLookupTableAccounts: lookupAccounts
  });

  if (position === "prepend") {
    message.instructions = [...newInstructions, ...message.instructions];
  } else {
    message.instructions.push(...newInstructions);
  }

  if (tx.version === "legacy") {
    const legacyMessage = message.compileToLegacyMessage();
    return new VersionedTransaction(legacyMessage);
  }

  const compiled = message.compileToV0Message(lookupAccounts);
  return new VersionedTransaction(compiled);
};

export const getSwapMetadata = (origin: string) => {
  const blinkUrl = renderBlinkUrl({
    blinkBaseUrl: `${origin}${BLINK_PATH}`,
    actionUrl: `${origin}${ACTION_PATH}`,
    label: ACTION_LABEL,
    message: "Execute a Jupiter swap with institutional safeguards."
  });

  return buildActionGetResponse({
    title: "Institutional Jupiter Swap",
    description: "Quote + build via Jupiter with priority fees, simulation, and blockhash guards.",
    icon: ICON_URL,
    label: ACTION_LABEL,
    action: {
      href: ACTION_PATH,
      label: ACTION_LABEL,
      parameters: [
        {
          name: "inputMint",
          label: "Input Mint",
          required: true,
          type: "text",
          pattern: "^[1-9A-HJ-NP-Za-km-z]{32,44}$"
        },
        {
          name: "outputMint",
          label: "Output Mint",
          required: true,
          type: "text",
          pattern: "^[1-9A-HJ-NP-Za-km-z]{32,44}$"
        },
        {
          name: "amount",
          label: "Amount (base units)",
          required: true,
          type: "number",
          min: 1
        },
        {
          name: "slippageBps",
          label: "Slippage (bps, default 50)",
          required: false,
          type: "number",
          min: 1,
          max: 1000
        }
      ]
    },
    related: [
      {
        type: "external-link",
        href: `https://blinks.inspector.solana.com/#${encodeURIComponent(blinkUrl)}`,
        label: "Open in Blinks Inspector"
      }
    ]
  });
};

type ComposeSwapParams = {
  body: unknown;
  connection: Connection;
  origin: string;
};

type SwapComposeResponse = Awaited<ReturnType<typeof buildTransactionPostResponse>> & {
  meta: {
    network: string;
    rpcEndpoint: string;
    priorityFeeMicrolamports: number;
    blockhash: string;
    lastValidBlockHeight: number;
    quote: {
      inAmount: number;
      outAmount: number;
      priceImpactPct: number;
      routePlan: unknown[];
    };
    blinkUrl: string;
    explorerHint: string;
    logs: string[];
  };
};

export const composeSwap = async ({ body, connection, origin }: ComposeSwapParams): Promise<SwapComposeResponse> => {
  if (typeof body !== "object" || body === null) {
    throw new Error("Request body must be an object");
  }

  const payload = body as SwapRequestBody;

  const user = parsePubkey(payload.account, "account");
  const inputMint = parsePubkey(payload.inputMint, "inputMint");
  const outputMint = parsePubkey(payload.outputMint, "outputMint");
  const amount = parseAmount(payload.amount);
  const slippageBps = payload.slippageBps ?? 50;

  const priorityFee = await estimatePriorityFee({
    writableAccounts: [user.toBase58()]
  });

  const quote = await fetchJupiterQuote({
    inputMint: inputMint.toBase58(),
    outputMint: outputMint.toBase58(),
    amount,
    slippageBps
  });

  const swap = await buildJupiterSwapTransaction({
    quoteResponse: quote,
    userPublicKey: user,
    connection,
    computeUnitPriceMicroLamports: priorityFee.chosen
  });

  const { blockhash, lastValidBlockHeight } = await getFreshBlockhash({
    connection,
    purpose: "send"
  });

  swap.transaction.message.recentBlockhash = blockhash;

  const extraInstructions: TransactionInstruction[] = [];

  const identityMemoIx = maybeCreateIdentityMemoInstruction();
  if (identityMemoIx) {
    extraInstructions.push(identityMemoIx);
  }

  if (payload.memo && payload.memo.trim().length > 0) {
    extraInstructions.push(encodeMemoInstruction(payload.memo.trim()));
  }

  if (extraInstructions.length > 0) {
    swap.transaction = await appendInstructions(connection, swap.transaction, extraInstructions);
  }

  const [limitIx, priceIx] = computeBudgetIx({
    cuLimit: DEFAULT_COMPUTE_UNIT_LIMIT,
    cuPriceMicrolamports: priorityFee.chosen
  });

  swap.transaction = await appendInstructions(connection, swap.transaction, [limitIx, priceIx], "prepend");

  const simulation = await simulateAndReport(connection, swap.transaction);

  const postResponse = await buildTransactionPostResponse({
    transaction: swap.transaction,
    message: "Simulate then sign to execute the Jupiter swap.",
    simulationLogs: simulation.logs
  });

  const rpcEndpoint = (connection as unknown as { rpcEndpoint?: string }).rpcEndpoint ?? "";
  const blinkUrl = renderBlinkUrl({
    blinkBaseUrl: `${origin}${BLINK_PATH}`,
    actionUrl: `${origin}${ACTION_PATH}`,
    label: ACTION_LABEL,
    message: "Execute a Jupiter swap with institutional safeguards."
  });

  return {
    ...postResponse,
    meta: {
      network: rpcEndpoint.includes("devnet")
        ? "devnet"
        : rpcEndpoint.includes("testnet")
          ? "testnet"
          : "mainnet",
      rpcEndpoint,
      priorityFeeMicrolamports: priorityFee.chosen,
      blockhash,
      lastValidBlockHeight,
      quote: {
        inAmount: quote.inAmount,
        outAmount: quote.outAmount,
        priceImpactPct: quote.priceImpactPct,
        routePlan: quote.routePlan
      },
      blinkUrl,
      explorerHint: connectionToExplorerUrl("<signature>", rpcEndpoint),
      logs: simulation.logs
    }
  };
};
