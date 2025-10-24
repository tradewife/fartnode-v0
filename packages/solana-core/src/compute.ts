import { ComputeBudgetProgram, TransactionInstruction } from "@solana/web3.js";

const DEFAULT_COMPUTE_UNITS = 200_000;

export const withComputeBudget = (
  units: number = DEFAULT_COMPUTE_UNITS,
  microLamports?: number
): TransactionInstruction => {
  if (typeof microLamports === "number") {
    return ComputeBudgetProgram.setComputeUnitPrice({ microLamports });
  }

  return ComputeBudgetProgram.setComputeUnitLimit({ units });
};
