import type { Commitment, Connection, VersionedTransaction } from "@solana/web3.js";

export type ActionMetadata = {
  title: string;
  description: string;
  icon?: string;
  inputs: Array<{
    name: string;
    type: "string" | "number";
    required?: boolean;
    default?: unknown;
  }>;
};

export type ComposeInput = {
  publicKey: string;
  amountSol?: number;
};

export type ComposeResult = {
  transaction: string;
  network: "devnet" | "testnet";
  simulateFirst: true;
  message?: string;
  simulationLogs?: string[];
};

export type PriorityFeeConfig = {
  microLamports?: number;
  defaultMicroLamports?: number;
};

export type ComputeBudgetConfig = {
  units?: number;
  microLamports?: number;
};

export type ActionInput = ComposeInput;

export type RpcPurpose = "read" | "send";

export type RpcEndpointConfig = {
  primary?: string;
  fallbacks?: string[];
};

export type RpcCommitmentConfig = {
  read?: Commitment;
  send?: Commitment;
};

export type PriorityFeeEstimates = {
  p50: number;
  p75: number;
  chosen: number;
  source: "rpc" | "fallback";
};

export type PriorityFeeEstimateParams = {
  writableAccounts?: string[];
  percentile?: 50 | 75;
  minMicrolamports?: number;
  maxMicrolamports?: number;
  fallbackMicrolamports?: number;
};

export type BlockhashWithExpiry = {
  blockhash: string;
  lastValidBlockHeight: number;
  commitment: Commitment;
  endpoint: string;
};

export type SimulationReport = {
  logs: string[];
  err: null;
  unitsConsumed?: number;
};

export type SimulationFailure = {
  logs?: string[];
  err: unknown;
  unitsConsumed?: number;
};

export type SendWithRetryParams = {
  connection: Connection;
  vtx: VersionedTransaction;
  commitment: Commitment;
  maxRetries?: number;
  lastValidBlockHeight: number;
  resign?: (proposal: {
    blockhash: string;
    lastValidBlockHeight: number;
  }) => Promise<VersionedTransaction>;
  refreshBlockhash?: () => Promise<BlockhashWithExpiry>;
};

export type SendWithRetryResult = {
  signature: string;
  explorerUrl: string;
  retries: number;
};
