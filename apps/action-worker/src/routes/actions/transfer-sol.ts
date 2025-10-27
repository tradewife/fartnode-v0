import {
  ACTIONS_CORS_HEADERS,
  buildActionGetResponse,
  buildTransactionPostResponse,
  buildVersionedTransaction,
  computeBudgetIx,
  connectionToExplorerUrl,
  estimatePriorityFee,
  getConnection,
  getFreshBlockhash,
  maybeCreateIdentityMemoInstruction,
  renderBlinkUrl,
  simulateAndReport
} from "@fartnode/solana-core";
import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";

const ACTION_PATH = "/api/actions/transfer-sol";
const BLINK_PATH = "/actions/transfer-sol";
const ACTION_LABEL = "Transfer SOL";
const ICON_URL = "https://solana.com/favicon.ico";
const DEFAULT_COMPUTE_UNIT_LIMIT = 200_000;

type TransferRequestBody = {
  account?: string;
  sender?: string;
  recipient?: string;
  amountSol?: number;
  amount?: number;
  memo?: string;
};

const parsePublicKey = (value: string | undefined, field: string): PublicKey => {
  if (!value) {
    throw new Error(`${field} is required`);
  }
  try {
    return new PublicKey(value);
  } catch {
    throw new Error(`${field} is not a valid Solana public key`);
  }
};

const normalizeAmountSol = (body: TransferRequestBody): number => {
  const amount = body.amountSol ?? body.amount;
  if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
    throw new Error("amountSol must be a positive number");
  }
  return amount;
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

export const getTransferSolMetadata = (origin: string) => {
  const blinkUrl = renderBlinkUrl({
    blinkBaseUrl: `${origin}${BLINK_PATH}`,
    actionUrl: `${origin}${ACTION_PATH}`,
    label: ACTION_LABEL,
    message: "Transfer SOL with institutional safeguards."
  });

  const externalLinks = [
    {
      type: "external-link" as const,
      href: `https://blinks.inspector.solana.com/#${encodeURIComponent(blinkUrl)}`,
      label: "Open in Blinks Inspector"
    }
  ];

  return buildActionGetResponse({
    title: "Institutional SOL Transfer",
    description: "Compose a SOL transfer with compute, fee, and blockhash guards.",
    icon: ICON_URL,
    label: ACTION_LABEL,
    action: {
      href: ACTION_PATH,
      label: ACTION_LABEL,
      type: "transaction",
      parameters: [
        {
          name: "recipient",
          label: "Recipient Address",
          required: true,
          pattern: "^[1-9A-HJ-NP-Za-km-z]{32,44}$",
          type: "text"
        },
        {
          name: "amountSol",
          label: "Amount (SOL)",
          required: true,
          type: "number",
          min: 0.000001
        },
        {
          name: "memo",
          label: "Memo (optional)",
          required: false,
          type: "textarea"
        }
      ]
    },
    related: externalLinks
  });
};

type ComposeTransferParams = {
  body: unknown;
  connection: Connection;
  origin: string;
};

type TransferComposeResponse = Awaited<ReturnType<typeof buildTransactionPostResponse>> & {
  meta: {
    network: string;
    rpcEndpoint: string;
    priorityFeeMicrolamports: number;
    computeUnitLimit: number;
    blockhash: string;
    lastValidBlockHeight: number;
    blinkUrl: string;
    explorerHint: string;
    logs: string[];
  };
};

export const composeTransferSol = async ({
  body,
  connection,
  origin
}: ComposeTransferParams): Promise<TransferComposeResponse> => {
  if (typeof body !== "object" || body === null) {
    throw new Error("Request body must be an object");
  }

  const payload = body as TransferRequestBody;
  const sender = parsePublicKey(payload.account ?? payload.sender, "account");
  const recipient = parsePublicKey(payload.recipient, "recipient");
  const amountSol = normalizeAmountSol(payload);
  const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);

  const priorityFee = await estimatePriorityFee({
    writableAccounts: [sender.toBase58(), recipient.toBase58()]
  });

  const [limitIx, priceIx] = computeBudgetIx({
    cuLimit: DEFAULT_COMPUTE_UNIT_LIMIT,
    cuPriceMicrolamports: priorityFee.chosen
  });

  const transferIx = SystemProgram.transfer({
    fromPubkey: sender,
    toPubkey: recipient,
    lamports
  });

  const identityMemoIx = maybeCreateIdentityMemoInstruction();
  const userMemoIx =
    typeof payload.memo === "string" && payload.memo.trim().length > 0
      ? encodeMemoInstruction(payload.memo.trim())
      : null;

  const { blockhash, lastValidBlockHeight } = await getFreshBlockhash({
    connection,
    purpose: "send"
  });

  const instructions: TransactionInstruction[] = [limitIx, priceIx, transferIx];
  if (identityMemoIx) {
    instructions.push(identityMemoIx);
  }
  if (userMemoIx) {
    instructions.push(userMemoIx);
  }

  const transaction = buildVersionedTransaction({
    payer: sender,
    instructions,
    blockhash
  });

  const simulation = await simulateAndReport(connection, transaction);

  const postResponse = await buildTransactionPostResponse({
    transaction,
    message: "Simulate then sign to transfer SOL.",
    simulationLogs: simulation.logs
  });

  const rpcEndpoint = (connection as unknown as { rpcEndpoint?: string }).rpcEndpoint ?? "";

  const blinkUrl = renderBlinkUrl({
    blinkBaseUrl: `${origin}${BLINK_PATH}`,
    actionUrl: `${origin}${ACTION_PATH}`,
    label: ACTION_LABEL,
    message: "Transfer SOL with institutional safeguards."
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
      computeUnitLimit: DEFAULT_COMPUTE_UNIT_LIMIT,
      blockhash,
      lastValidBlockHeight,
      blinkUrl,
      explorerHint: connectionToExplorerUrl("<signature>", rpcEndpoint),
      logs: simulation.logs
    }
  };
};
