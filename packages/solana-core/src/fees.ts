import { ComputeBudgetProgram, PublicKey, type TransactionInstruction } from "@solana/web3.js";

import { getConfiguredCommitment, selectRpc } from "./rpc.js";
import type {
  PriorityFeeConfig,
  PriorityFeeEstimateParams,
  PriorityFeeEstimates
} from "./types.js";

export const DEFAULT_PRIORITY_FEE_MICROLAMPORTS = 5_000;
const DEFAULT_MAX_FEE_MICROLAMPORTS = 1_000_000; // 1 lamport per CU
const DEFAULT_MIN_FEE_MICROLAMPORTS = 0;
const DEFAULT_PERCENTILE: 50 | 75 = 75;
const CONGESTION_MARGIN = 0.15;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const computePercentile = (values: number[], percentile: 50 | 75): number => {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index =
    percentile === 50
      ? Math.floor((sorted.length - 1) * 0.5)
      : Math.floor((sorted.length - 1) * 0.75);
  return sorted[index] ?? sorted[sorted.length - 1] ?? 0;
};

const resolveBounds = (
  params: PriorityFeeEstimateParams | undefined
): { min: number; max: number } => {
  const env = typeof process !== "undefined" ? process.env ?? {} : {};
  const envMax = env.SOLANA_PRIORITY_FEE_MAX_MICROLAMPORTS
    ? Number.parseInt(env.SOLANA_PRIORITY_FEE_MAX_MICROLAMPORTS, 10)
    : undefined;
  const envMin = env.SOLANA_PRIORITY_FEE_MIN_MICROLAMPORTS
    ? Number.parseInt(env.SOLANA_PRIORITY_FEE_MIN_MICROLAMPORTS, 10)
    : undefined;

  const min = params?.minMicrolamports ?? envMin ?? DEFAULT_MIN_FEE_MICROLAMPORTS;
  const max = params?.maxMicrolamports ?? envMax ?? DEFAULT_MAX_FEE_MICROLAMPORTS;

  return { min, max };
};

type RpcFeeResponse = {
  prioritizationFee: number;
};

export const estimatePriorityFee = async (
  params: PriorityFeeEstimateParams = {}
): Promise<PriorityFeeEstimates> => {
  const percentile = params.percentile ?? DEFAULT_PERCENTILE;
  const { min, max } = resolveBounds(params);
  const fallback = clamp(
    params.fallbackMicrolamports ?? DEFAULT_PRIORITY_FEE_MICROLAMPORTS,
    min,
    max
  );

  const commitment = getConfiguredCommitment("read");
  const connection = await selectRpc(commitment, "read");

  let rpcFees: RpcFeeResponse[] = [];

  try {
    const lockedWritableAccounts = params.writableAccounts
      ?.map((address) => {
        try {
          return new PublicKey(address);
        } catch (error) {
          console.warn("Skipping invalid writable account for fee estimation", address, error);
          return null;
        }
      })
      .filter((value): value is PublicKey => value !== null);

    rpcFees = await connection.getRecentPrioritizationFees({
      lockedWritableAccounts
    });
  } catch (error) {
    console.warn("[solana-core] Failed to fetch recent prioritization fees", error);
  }

  const rawValues = rpcFees.map((item) => item.prioritizationFee).filter((value) => value >= 0);
  if (rawValues.length === 0) {
    return {
      p50: fallback,
      p75: fallback,
      chosen: fallback,
      source: "fallback"
    };
  }

  const p50 = clamp(computePercentile(rawValues, 50), min, max);
  const p75 = clamp(computePercentile(rawValues, 75), min, max);
  const base = percentile === 50 ? p50 : p75;
  const margin = Math.round(base * CONGESTION_MARGIN);
  const chosen = clamp(base + margin, min, max);

  console.info(
    "[solana-core] Priority fee estimation",
    JSON.stringify({
      writableAccounts: params.writableAccounts ?? [],
      percentile,
      min,
      max,
      p50,
      p75,
      chosen,
      fallback
    })
  );

  return {
    p50,
    p75,
    chosen,
    source: "rpc"
  };
};

export type ComputeBudgetInstructionTuple = readonly [
  TransactionInstruction,
  TransactionInstruction
];

export const computeBudgetIx = ({
  cuLimit,
  cuPriceMicrolamports
}: {
  cuLimit: number;
  cuPriceMicrolamports: number;
}): ComputeBudgetInstructionTuple => {
  if (!Number.isFinite(cuLimit) || cuLimit <= 0) {
    throw new Error("cuLimit must be a positive number");
  }
  if (!Number.isFinite(cuPriceMicrolamports) || cuPriceMicrolamports < 0) {
    throw new Error("cuPriceMicrolamports must be >= 0");
  }

  const limitIx = ComputeBudgetProgram.setComputeUnitLimit({
    units: Math.trunc(cuLimit)
  });
  const priceIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: Math.trunc(cuPriceMicrolamports)
  });

  console.info(
    "[solana-core] Compute budget instructions",
    JSON.stringify({ cuLimit, cuPriceMicrolamports })
  );

  return [limitIx, priceIx];
};

export const resolvePriorityFee = (config?: PriorityFeeConfig): number => {
  if (config?.microLamports && config.microLamports > 0) {
    return config.microLamports;
  }

  if (config?.defaultMicroLamports && config.defaultMicroLamports > 0) {
    return config.defaultMicroLamports;
  }

  return DEFAULT_PRIORITY_FEE_MICROLAMPORTS;
};

export const withPriorityFee = (config?: PriorityFeeConfig): TransactionInstruction => {
  return ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: resolvePriorityFee(config)
  });
};
