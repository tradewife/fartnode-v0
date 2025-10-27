import type { Commitment, Connection, VersionedTransaction } from "@solana/web3.js";

import type { SimulationFailure, SimulationReport } from "./types.js";

export class SimulationError extends Error {
  readonly logs?: string[];
  readonly unitsConsumed?: number;
  readonly originalError: unknown;

  constructor(message: string, details: SimulationFailure) {
    super(message);
    this.name = "SimulationError";
    this.logs = details.logs;
    this.unitsConsumed = details.unitsConsumed;
    this.originalError = details.err;
  }
}

type SimulationParams = {
  commitment?: Commitment;
  enableSignatureVerification?: boolean;
};

export const simulateAndReport = async (
  connection: Connection,
  transaction: VersionedTransaction,
  { commitment, enableSignatureVerification = false }: SimulationParams = {}
): Promise<SimulationReport> => {
  const response = await connection.simulateTransaction(transaction, {
    commitment,
    sigVerify: enableSignatureVerification,
    replaceRecentBlockhash: false
  });

  const logs = response.value.logs ?? [];
  const err = response.value.err ?? null;
  const unitsConsumed = response.value.unitsConsumed;

  if (err !== null) {
    throw new SimulationError("Simulation returned a non-null error", {
      logs,
      err,
      unitsConsumed: unitsConsumed ?? undefined
    });
  }

  return {
    logs,
    err: null,
    unitsConsumed: unitsConsumed ?? undefined
  };
};

export const simulateFirst = async (
  conn: Connection,
  tx: VersionedTransaction,
  options: {
    commitment?: Commitment;
    replaceRecentBlockhash?: boolean;
    sigVerify?: boolean;
  } = {}
): Promise<SimulationReport> => {
  const report = await simulateAndReport(conn, tx, {
    commitment: options.commitment,
    enableSignatureVerification: options.sigVerify ?? false
  });

  return {
    logs: report.logs,
    err: report.err,
    unitsConsumed: report.unitsConsumed
  };
};
