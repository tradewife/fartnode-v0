import { type Commitment, Connection } from "@solana/web3.js";

const DEFAULT_SOLANA_RPC_URL = "https://api.devnet.solana.com";

const getProcessEnv = (): NodeJS.ProcessEnv | undefined => {
  if (typeof process !== "undefined" && process?.env) {
    return process.env;
  }
  return undefined;
};

export type RpcEnvironment = Record<string, string | undefined>;

export type ConnectionConfig = {
  endpointOverride?: string;
  commitment?: Commitment;
  env?: RpcEnvironment;
};

export const resolveEndpoint = (
  override?: string,
  env: RpcEnvironment | undefined = getProcessEnv()
): string => {
  if (override && override.length > 0) {
    return override;
  }

  if (env?.SOLANA_RPC_URL && env.SOLANA_RPC_URL.length > 0) {
    return env.SOLANA_RPC_URL;
  }

  return DEFAULT_SOLANA_RPC_URL;
};

export const createConnection = (
  endpoint: string,
  commitment: Commitment = "confirmed"
): Connection => new Connection(endpoint, commitment);

export const getConnectionFromEnv = (config: ConnectionConfig = {}): Connection => {
  const endpoint = resolveEndpoint(config.endpointOverride, config.env);
  return createConnection(endpoint, config.commitment ?? "confirmed");
};

export const getConnection = (
  endpointOverride?: string,
  commitment: Commitment = "confirmed"
): Connection => getConnectionFromEnv({ endpointOverride, commitment });

export const getRpcEndpoint = (endpointOverride?: string): string =>
  resolveEndpoint(endpointOverride);
