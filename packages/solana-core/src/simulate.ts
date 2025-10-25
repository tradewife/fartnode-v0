import { type Commitment, Connection, VersionedTransaction } from "@solana/web3.js";

export type SimulationResult = {
  logs?: string[];
  err?: unknown;
};

export type SimulationOptions = {
  commitment?: Commitment;
  replaceRecentBlockhash?: boolean;
  sigVerify?: boolean;
};

export const simulateFirst = async (
  conn: Connection,
  tx: VersionedTransaction,
  options: SimulationOptions = {}
): Promise<SimulationResult> => {
  const { value } = await conn.simulateTransaction(
    tx,
    {
      sigVerify: options.sigVerify ?? false,
      replaceRecentBlockhash: options.replaceRecentBlockhash ?? true,
      commitment: options.commitment
    }
  );

  return {
    logs: value.logs ?? undefined,
    err: value.err ?? undefined
  };
};
