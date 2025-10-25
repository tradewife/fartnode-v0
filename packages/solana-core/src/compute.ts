import { ComputeBudgetProgram, type TransactionInstruction } from "@solana/web3.js";
import type { ComputeBudgetConfig } from "./types.js";

export const DEFAULT_COMPUTE_UNIT_LIMIT = 200_000;

export const withComputeUnitLimit = (
  units: number = DEFAULT_COMPUTE_UNIT_LIMIT
): TransactionInstruction => {
  return ComputeBudgetProgram.setComputeUnitLimit({ units });
};

export const withComputeUnitPrice = (microLamports: number): TransactionInstruction => {
  return ComputeBudgetProgram.setComputeUnitPrice({ microLamports });
};

export const withComputeBudget = (config: ComputeBudgetConfig = {}): TransactionInstruction[] => {
  const instructions: TransactionInstruction[] = [];
  const units = config.units ?? DEFAULT_COMPUTE_UNIT_LIMIT;

  instructions.push(withComputeUnitLimit(units));

  if (typeof config.microLamports === "number" && config.microLamports > 0) {
    instructions.push(withComputeUnitPrice(config.microLamports));
  }

  return instructions;
};
