import {
  ActionInput,
  ActionMetadata,
  ComposeResult,
  buildVersionedTx,
  getConnection,
  simulateFirst,
  withComputeBudget,
  withPriorityFee
} from "@fartnode/solana-core";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  VersionedTransaction
} from "@solana/web3.js";

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

const encodeBase64 = (data: Uint8Array): string => {
  if (typeof globalThis.btoa === "function") {
    let binary = "";
    data.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return globalThis.btoa(binary);
  }

  const maybeBuffer = (globalThis as {
    Buffer?: { from(data: Uint8Array): { toString(encoding: "base64"): string } };
  }).Buffer;

  if (maybeBuffer) {
    return maybeBuffer.from(data).toString("base64");
  }

  throw new Error("No base64 encoder available");
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
    withComputeBudget(),
    withPriorityFee(),
    SystemProgram.transfer({
      fromPubkey: recipient,
      toPubkey: recipient,
      lamports: 0
    })
  ];

  return buildVersionedTx({
    payer: recipient,
    ixs: instructions,
    blockhash
  });
};

export const getDevnetAirdropMetadata = (): ActionMetadata => metadata;

type ComposeParams = {
  rpcUrl?: string;
  input: ActionInput;
};

export const composeDevnetAirdrop = async ({
  rpcUrl,
  input
}: ComposeParams): Promise<ComposeResult> => {
  const { recipient, amountSol } = ensureValidInput(input);
  const connection = getConnection(rpcUrl);

  // Best-effort request to seed the wallet with SOL on devnet.
  try {
    await connection.requestAirdrop(recipient, amountSol * LAMPORTS_PER_SOL);
  } catch (error) {
    console.warn("Devnet airdrop request failed", error);
  }

  const { blockhash } = await connection.getLatestBlockhash();
  const tx = await composePlaceholderTransaction(recipient, blockhash);

  try {
    await simulateFirst(connection, tx);
  } catch (error) {
    console.warn("Simulation failed (continuing with simulateFirst=true)", error);
  }

  const serialized = tx.serialize();

  return {
    transactionBase64: encodeBase64(serialized),
    network: "devnet",
    simulateFirst: true
  };
};
