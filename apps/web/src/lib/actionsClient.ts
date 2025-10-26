export type ActionInputField = {
  name: string;
  type: string;
  required: boolean;
  default?: unknown;
};

export type ActionMetadata = {
  title: string;
  description: string;
  inputs: ActionInputField[];
};

export type DevnetAirdropRequest = {
  publicKey: string;
  amountSol?: number;
};

export type DevnetAirdropResponse = {
  transaction: string;
  message?: string;
  network: string;
  simulateFirst: boolean;
  simulationLogs?: string[];
};

type FetchLike = typeof fetch;

const ACTION_PATH = "/api/solana/actions/devnet-airdrop";

const normalizeBaseUrl = (url: string): string => url.replace(/\/+$/, "");

export const createActionsClient = (
  baseUrl: string | undefined = import.meta.env.VITE_ACTION_WORKER_URL,
  fetchImpl: FetchLike = fetch
) => {
  const resolveBaseUrl = (): string => {
    const resolved = baseUrl;
    if (!resolved) {
      throw new Error("VITE_ACTION_WORKER_URL is not configured");
    }
    try {
      const parsed = new URL(resolved);
      return normalizeBaseUrl(parsed.toString());
    } catch {
      throw new Error("VITE_ACTION_WORKER_URL must be a valid URL");
    }
  };

  const getEndpoint = (): string => `${resolveBaseUrl()}${ACTION_PATH}`;

  const getMetadata = async (): Promise<ActionMetadata> => {
    const response = await fetchImpl(getEndpoint(), {
      method: "GET",
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Unable to load action metadata (${response.status})`);
    }

    return (await response.json()) as ActionMetadata;
  };

  const composeTransaction = async (
    payload: DevnetAirdropRequest
  ): Promise<DevnetAirdropResponse> => {
    if (!payload.publicKey) {
      throw new Error("publicKey is required");
    }

    const response = await fetchImpl(getEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const contentType = response.headers.get("Content-Type") ?? "";
      let message = `Action worker returned ${response.status}`;

      const rawBody = await response.text();
      if (rawBody) {
        if (contentType.includes("application/json")) {
          try {
            const parsed = JSON.parse(rawBody) as { error?: unknown };
            if (parsed?.error && typeof parsed.error === "string") {
              message = parsed.error;
            }
          } catch {
            message = rawBody;
          }
        } else {
          message = rawBody;
        }
      }

      throw new Error(message);
    }

    return (await response.json()) as DevnetAirdropResponse;
  };

  return {
    getEndpoint,
    getMetadata,
    composeTransaction
  };
};

const defaultClient = createActionsClient();

export const getDevnetAirdropMetadata = (): Promise<ActionMetadata> =>
  defaultClient.getMetadata();

export const requestDevnetAirdrop = (
  payload: DevnetAirdropRequest
): Promise<DevnetAirdropResponse> => defaultClient.composeTransaction(payload);

export const getDevnetAirdropEndpoint = (): string => defaultClient.getEndpoint();
