import { ComputeBudgetProgram, TransactionInstruction } from "@solana/web3.js";

export const defaultPriorityFeeMicrolamports = 5_000;

export const withPriorityFee = (
  microLamports: number = defaultPriorityFeeMicrolamports
): TransactionInstruction => {
  return ComputeBudgetProgram.setComputeUnitPrice({ microLamports });
};
