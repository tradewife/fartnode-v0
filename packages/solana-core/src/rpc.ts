import { Commitment, Connection } from "@solana/web3.js";

import type { RpcCommitmentConfig, RpcEndpointConfig, RpcPurpose } from "./types.js";

const DEFAULT_ENDPOINTS = [
  "https://api.mainnet-beta.solana.com",
  "https://api.mainnet.rpcpool.com"
] as const;

const DEFAULT_COMMITMENTS: Required<RpcCommitmentConfig> = {
  read: "confirmed",
  send: "confirmed"
};

const HEALTH_TTL_MS = 45_000;
const connectionCache = new Map<string, Connection>();
const healthCache = new Map<string, number>();

const getProcessEnv = (): NodeJS.ProcessEnv => {
  if (typeof process !== "undefined" && process.env) {
    return process.env;
  }
  return {};
};

const normalizeUrl = (endpoint: string): string => {
  return endpoint.trim().replace(/\/+$/, "");
};

const parseFallbacks = (raw: string | undefined): string[] => {
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((item) => normalizeUrl(item))
    .filter((item) => item.length > 0);
};

const readCommitmentsFromEnv = (): RpcCommitmentConfig => {
  const env = getProcessEnv();
  const read = env.SOLANA_COMMITMENT_READ as Commitment | undefined;
  const send = env.SOLANA_COMMITMENT_SEND as Commitment | undefined;
  return {
    read: read ?? undefined,
    send: send ?? undefined
  };
};

export const getConfiguredCommitment = (
  purpose: RpcPurpose,
  override?: Commitment
): Commitment => {
  if (override) {
    return override;
  }

  const envCommitments = readCommitmentsFromEnv();
  const fromEnv = envCommitments[purpose];
  if (fromEnv) {
    return fromEnv;
  }

  return DEFAULT_COMMITMENTS[purpose];
};

const readEndpointConfig = (): RpcEndpointConfig => {
  const env = getProcessEnv();
  const primary =
    env.SOLANA_RPC_PRIMARY ??
    env.SOLANA_RPC_URL ??
    env.NEXT_PUBLIC_SOLANA_RPC_URL ??
    env.PUBLIC_SOLANA_RPC_URL;
  const fallbacks = parseFallbacks(env.SOLANA_RPC_FALLBACKS ?? env.SOLANA_RPC_URLS);

  const primaryNormalized = primary ? normalizeUrl(primary) : undefined;
  const fallbackList = fallbacks.filter((endpoint) => endpoint !== primaryNormalized);

  if (!primaryNormalized && fallbackList.length === 0) {
    return {
      primary: undefined,
      fallbacks: Array.from(DEFAULT_ENDPOINTS)
    };
  }

  return {
    primary: primaryNormalized,
    fallbacks: fallbackList
  };
};

const buildEndpointList = (override?: string): string[] => {
  if (override) {
    return [normalizeUrl(override)];
  }

  const { primary, fallbacks } = readEndpointConfig();
  const endpoints: string[] = [];
  if (primary) {
    endpoints.push(primary);
  }
  if (fallbacks && fallbacks.length > 0) {
    endpoints.push(...fallbacks);
  }
  if (endpoints.length === 0) {
    endpoints.push(...DEFAULT_ENDPOINTS);
  }
  return endpoints;
};

const connectionCacheKey = (endpoint: string, commitment: Commitment): string =>
  `${endpoint}::${commitment}`;

const getOrCreateConnection = (endpoint: string, commitment: Commitment): Connection => {
  const key = connectionCacheKey(endpoint, commitment);
  const cached = connectionCache.get(key);
  if (cached) {
    return cached;
  }

  const connection = new Connection(endpoint, commitment);
  connectionCache.set(key, connection);
  return connection;
};

const shouldPingEndpoint = (endpoint: string): boolean => {
  const lastHealthy = healthCache.get(endpoint);
  if (!lastHealthy) {
    return true;
  }
  return Date.now() - lastHealthy > HEALTH_TTL_MS;
};

const recordHealth = (endpoint: string, healthy: boolean): void => {
  if (healthy) {
    healthCache.set(endpoint, Date.now());
    return;
  }
  healthCache.delete(endpoint);
};

const pingEndpoint = async (connection: Connection, endpoint: string): Promise<void> => {
  if (!shouldPingEndpoint(endpoint)) {
    return;
  }

  try {
    await connection.getEpochInfo();
    recordHealth(endpoint, true);
  } catch (error) {
    recordHealth(endpoint, false);
    throw error;
  }
};

const logSelection = (endpoint: string, commitment: Commitment, purpose: RpcPurpose): void => {
  console.info(
    `[solana-core] RPC selection`,
    JSON.stringify({ endpoint, commitment, purpose })
  );
};

const logFailure = (endpoint: string, error: unknown): void => {
  console.warn(`[solana-core] RPC endpoint failed`, endpoint, error);
};

export const getRpcEndpoints = (override?: string): string[] => buildEndpointList(override);

export const selectRpc = async (
  commitment: Commitment,
  purpose: RpcPurpose,
  override?: string
): Promise<Connection> => {
  const endpoints = buildEndpointList(override);
  const errors: Array<{ endpoint: string; error: unknown }> = [];

  for (const endpoint of endpoints) {
    const connection = getOrCreateConnection(endpoint, commitment);
    try {
      await pingEndpoint(connection, endpoint);
      logSelection(endpoint, commitment, purpose);
      return connection;
    } catch (error) {
      errors.push({ endpoint, error });
      logFailure(endpoint, error);
    }
  }

  const message = `No healthy RPC endpoints available (commitment=${commitment}, purpose=${purpose}). Tried: ${endpoints.join(
    ", "
  )}`;
  const aggregate = new AggregateError(errors.map((item) => item.error), message);
  throw aggregate;
};

type ConnectionConfig = {
  endpointOverride?: string;
  commitment?: Commitment;
  purpose?: RpcPurpose;
};

export const getConnectionFromEnv = async ({
  endpointOverride,
  commitment,
  purpose
}: ConnectionConfig = {}): Promise<Connection> => {
  const inferredPurpose: RpcPurpose = purpose ?? (endpointOverride ? "read" : "send");
  const effectiveCommitment = commitment ?? getConfiguredCommitment(inferredPurpose);
  return selectRpc(effectiveCommitment, inferredPurpose, endpointOverride);
};

export const getConnection = (
  endpointOverride?: string,
  commitment?: Commitment,
  purpose?: RpcPurpose
): Promise<Connection> => getConnectionFromEnv({ endpointOverride, commitment, purpose });

export const resolveEndpoint = (override?: string): string => {
  const endpoints = buildEndpointList(override);
  return endpoints[0];
};

const inferClusterFromEndpoint = (endpoint: string): "mainnet" | "devnet" | "testnet" | "local" | "custom" => {
  if (/devnet/i.test(endpoint)) {
    return "devnet";
  }
  if (/testnet/i.test(endpoint)) {
    return "testnet";
  }
  if (/localhost|127\.0\.0\.1|:8899/i.test(endpoint)) {
    return "local";
  }
  if (/mainnet|rpcpool|helius|quicknode|solana-mainnet/i.test(endpoint)) {
    return "mainnet";
  }
  return "custom";
};

export const rpcEndpointToExplorerClusterParam = (endpoint: string): string | undefined => {
  const cluster = inferClusterFromEndpoint(endpoint);
  switch (cluster) {
    case "devnet":
      return "devnet";
    case "testnet":
      return "testnet";
    case "local":
      return "custom";
    default:
      return undefined;
  }
};

export const connectionToExplorerUrl = (
  signature: string,
  endpoint: string
): string => {
  const clusterParam = rpcEndpointToExplorerClusterParam(endpoint);
  const base = "https://explorer.solana.com/tx/";
  if (clusterParam) {
    return `${base}${signature}?cluster=${clusterParam}`;
  }
  return `${base}${signature}`;
};
