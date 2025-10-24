import { Connection, VersionedTransaction } from "@solana/web3.js";

type SimulationResult = {
  logs?: string[];
  err?: unknown;
};

export const simulateFirst = async (
  conn: Connection,
  tx: VersionedTransaction
): Promise<SimulationResult> => {
  const { value } = await conn.simulateTransaction(tx, {
    sigVerify: false,
    replaceRecentBlockhash: true
  });

  return {
    logs: value.logs ?? undefined,
    err: value.err ?? undefined
  };
};
