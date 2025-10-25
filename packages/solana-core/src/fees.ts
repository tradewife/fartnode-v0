import { ComputeBudgetProgram, type TransactionInstruction } from "@solana/web3.js";
import type { PriorityFeeConfig } from "./types.js";

export const DEFAULT_PRIORITY_FEE_MICROLAMPORTS = 5_000;

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
