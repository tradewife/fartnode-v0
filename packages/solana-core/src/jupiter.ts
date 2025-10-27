import type { Commitment, Connection, PublicKey } from "@solana/web3.js";
import { VersionedTransaction } from "@solana/web3.js";

import { simulateAndReport } from "./simulate.js";
import type { SimulationReport } from "./types.js";

const DEFAULT_JUPITER_BASE_URL = "https://quote-api.jup.ag";
const DEFAULT_SLIPPAGE_BPS = 50; // 0.5%

const getEnv = (): NodeJS.ProcessEnv => {
  if (typeof process !== "undefined" && process.env) {
    return process.env;
  }
  return {};
};

export const getJupiterBaseUrl = (): string => {
  const env = getEnv();
  return env.JUPITER_BASE_URL?.trim().length ? env.JUPITER_BASE_URL.trim() : DEFAULT_JUPITER_BASE_URL;
};

export type JupiterQuoteParams = {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippageBps?: number;
  swapMode?: "ExactIn" | "ExactOut";
};

export type JupiterQuoteResponse = {
  inputMint: string;
  outputMint: string;
  inAmount: number;
  outAmount: number;
  otherAmountThreshold: number;
  swapMode: "ExactIn" | "ExactOut";
  priceImpactPct: number;
  routePlan: unknown[];
  contextSlot: number;
};

export const fetchJupiterQuote = async ({
  inputMint,
  outputMint,
  amount,
  slippageBps = DEFAULT_SLIPPAGE_BPS,
  swapMode = "ExactIn"
}: JupiterQuoteParams): Promise<JupiterQuoteResponse> => {
  const baseUrl = getJupiterBaseUrl();
  const url = new URL("/v6/quote", baseUrl);
  url.searchParams.set("inputMint", inputMint);
  url.searchParams.set("outputMint", outputMint);
  url.searchParams.set("amount", amount.toString());
  url.searchParams.set("slippageBps", slippageBps.toString());
  url.searchParams.set("swapMode", swapMode);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Jupiter quote failed (${res.status}): ${body}`);
  }

  return (await res.json()) as JupiterQuoteResponse;
};

type JupiterSwapParams = {
  quoteResponse: JupiterQuoteResponse;
  userPublicKey: PublicKey;
  connection: Connection;
  commitment?: Commitment;
  wrapAndUnwrapSol?: boolean;
  computeUnitPriceMicroLamports?: number;
};

type JupiterSwapResult = {
  transaction: VersionedTransaction;
  simulation: SimulationReport;
};

const decodeSwapTransaction = (swapTransaction: string): VersionedTransaction => {
  const maybeBuffer = (globalThis as typeof globalThis & {
    Buffer?: { from(data: string, encoding: "base64"): Uint8Array };
  }).Buffer;
  let bytes: Uint8Array;
  if (maybeBuffer) {
    bytes = maybeBuffer.from(swapTransaction, "base64");
  } else if (typeof globalThis.atob === "function") {
    const binary = globalThis.atob(swapTransaction);
    const output = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      output[i] = binary.charCodeAt(i);
    }
    bytes = output;
  } else {
    throw new Error("No base64 decoder available for Jupiter swap transaction");
  }

  return VersionedTransaction.deserialize(bytes);
};

export const buildJupiterSwapTransaction = async ({
  quoteResponse,
  userPublicKey,
  connection,
  wrapAndUnwrapSol = true,
  computeUnitPriceMicroLamports,
  commitment
}: JupiterSwapParams): Promise<JupiterSwapResult> => {
  const baseUrl = getJupiterBaseUrl();
  const res = await fetch(`${baseUrl}/v6/swap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse,
      userPublicKey: userPublicKey.toBase58(),
      wrapAndUnwrapSol,
      computeUnitPriceMicroLamports
    })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Jupiter swap build failed (${res.status}): ${body}`);
  }

  const payload = (await res.json()) as { swapTransaction: string };
  if (!payload.swapTransaction) {
    throw new Error("Jupiter swap response missing transaction payload");
  }

  const transaction = decodeSwapTransaction(payload.swapTransaction);
  const simulation = await simulateAndReport(connection, transaction, { commitment });

  return {
    transaction,
    simulation
  };
};
