import {
  type ActionInput,
  type ActionMetadata,
  type ComposeResult,
  buildVersionedTransaction,
  getConnection,
  serializeTransactionBase64,
  simulateFirst,
  withComputeBudget,
  withPriorityFee
} from "@fartnode/solana-core";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  TransactionInstruction,
  VersionedTransaction
} from "@solana/web3.js";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const MEMO_TEXT = "FARTNODE demo";

const memoEncoder = new TextEncoder();

const toInstructionData = (memo: string): Uint8Array | unknown => {
  const bytes = memoEncoder.encode(memo);
  const maybeBuffer = (globalThis as typeof globalThis & {
    Buffer?: { from(input: Uint8Array): unknown };
  }).Buffer;

  if (maybeBuffer) {
    return maybeBuffer.from(bytes);
  }

  return bytes;
};

const createMemoInstruction = (signer: PublicKey, memo: string): TransactionInstruction => {
  return new TransactionInstruction({
    keys: [{ pubkey: signer, isSigner: true, isWritable: false }],
    programId: MEMO_PROGRAM_ID,
    data: toInstructionData(memo)
  } as any);
};

const MAX_AIRDROP_SOL = 5;
const DEFAULT_AIRDROP_SOL = 1;

const metadata: ActionMetadata = {
  title: "Devnet Airdrop",
  description: "Request SOL on devnet and return a versioned transaction.",
  inputs: [
    { name: "publicKey", type: "string", required: true },
    { name: "amountSol", type: "number", required: false, default: 1 }
  ]
};

const ensureValidInput = (input: ActionInput): { recipient: PublicKey; amountSol: number } => {
  if (!input?.publicKey) {
    throw new Error("publicKey is required");
  }

  let recipient: PublicKey;
  try {
    recipient = new PublicKey(input.publicKey);
  } catch (error) {
    throw new Error("Invalid publicKey");
  }

  const amount = input.amountSol ?? DEFAULT_AIRDROP_SOL;
  if (Number.isNaN(amount) || amount <= 0) {
    throw new Error("amountSol must be greater than 0");
  }
  if (amount > MAX_AIRDROP_SOL) {
    throw new Error(`amountSol must be <= ${MAX_AIRDROP_SOL}`);
  }

  return {
    recipient,
    amountSol: amount
  };
};

const composePlaceholderTransaction = async (
  recipient: PublicKey,
  blockhash: string
): Promise<VersionedTransaction> => {
  const instructions = [
    ...withComputeBudget(),
    withPriorityFee(),
    createMemoInstruction(recipient, MEMO_TEXT)
  ];

  return buildVersionedTransaction({
    payer: recipient,
    instructions,
    blockhash
  });
};

export const getDevnetAirdropMetadata = (): ActionMetadata => metadata;

type ComposeParams = {
  rpcUrl?: string;
  input: ActionInput;
  connection?: Connection;
};

export const composeDevnetAirdrop = async ({
  rpcUrl,
  input,
  connection: maybeConnection
}: ComposeParams): Promise<ComposeResult> => {
  const { recipient, amountSol } = ensureValidInput(input);
  const connection = maybeConnection ?? (await getConnection(rpcUrl, undefined, "send"));

  // Best-effort request to seed the wallet with SOL on devnet.
  try {
    const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);
    await connection.requestAirdrop(recipient, lamports);
  } catch (error) {
    console.warn("Devnet airdrop request failed", error);
  }

  const { blockhash } = await connection.getLatestBlockhash();
  const tx = await composePlaceholderTransaction(recipient, blockhash);

  let simulationLogs: string[] | undefined;
  try {
    const simulation = await simulateFirst(connection, tx);
    simulationLogs = simulation.logs;
  } catch (error) {
    console.warn("Simulation failed (continuing with simulateFirst=true)", error);
  }

  return {
    transaction: serializeTransactionBase64(tx),
    network: "devnet",
    simulateFirst: true,
    message: "Simulate before signing in your wallet.",
    simulationLogs
  };
};
