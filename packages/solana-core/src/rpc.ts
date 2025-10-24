import { Connection } from "@solana/web3.js";

const DEFAULT_SOLANA_RPC_URL = "https://api.devnet.solana.com";

const getProcessEnv = (): NodeJS.ProcessEnv | undefined => {
  if (typeof process !== "undefined" && process?.env) {
    return process.env;
  }
  return undefined;
};

const resolveEndpoint = (override?: string): string => {
  if (override && override.length > 0) {
    return override;
  }

  const env = getProcessEnv();
  if (env?.SOLANA_RPC_URL && env.SOLANA_RPC_URL.length > 0) {
    return env.SOLANA_RPC_URL;
  }

  return DEFAULT_SOLANA_RPC_URL;
};

export const getConnection = (endpointOverride?: string): Connection => {
  const endpoint = resolveEndpoint(endpointOverride);
  return new Connection(endpoint, "confirmed");
};

export const getRpcEndpoint = (endpointOverride?: string): string => resolveEndpoint(endpointOverride);
