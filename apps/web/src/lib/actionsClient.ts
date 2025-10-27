import type { ActionGetResponse, ActionPostResponse } from "@solana/actions";

type FetchLike = typeof fetch;

const TRANSFER_PATH = "/api/actions/transfer-sol";
const SWAP_PATH = "/api/actions/swap";

export type TransferComposeResponse = ActionPostResponse & {
  type: "transaction";
  transaction: string;
  simulateFirst?: boolean;
  simulationLogs?: string[];
  meta?: Record<string, unknown>;
};

export type SwapComposeResponse = TransferComposeResponse;

const normalizeBaseUrl = (url: string): string => url.replace(/\/+$/, "");

const parseJson = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const raw = await response.text();
    throw new Error(raw || `Request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
};

export const createActionsClient = (
  baseUrl: string | undefined = import.meta.env.VITE_ACTION_WORKER_URL,
  fetchImpl: FetchLike = fetch
) => {
  const resolveBaseUrl = (): string => {
    if (!baseUrl) {
      throw new Error("VITE_ACTION_WORKER_URL is not configured");
    }
    try {
      const parsed = new URL(baseUrl);
      return normalizeBaseUrl(parsed.toString());
    } catch {
      throw new Error("VITE_ACTION_WORKER_URL must be a valid URL");
    }
  };

  const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const url = `${resolveBaseUrl()}${path}`;
    const response = await fetchImpl(url, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init?.headers ?? {})
      }
    });
    return parseJson<T>(response);
  };

  const getTransferMetadata = (): Promise<ActionGetResponse> =>
    request<ActionGetResponse>(TRANSFER_PATH, { method: "GET" });

  const composeTransfer = (payload: Record<string, unknown>): Promise<TransferComposeResponse> =>
    request<TransferComposeResponse>(TRANSFER_PATH, {
      method: "POST",
      body: JSON.stringify(payload)
    });

  const getSwapMetadata = (): Promise<ActionGetResponse> =>
    request<ActionGetResponse>(SWAP_PATH, { method: "GET" });

  const composeSwap = (payload: Record<string, unknown>): Promise<SwapComposeResponse> =>
    request<SwapComposeResponse>(SWAP_PATH, {
      method: "POST",
      body: JSON.stringify(payload)
    });

  return {
    getTransferMetadata,
    composeTransfer,
    getSwapMetadata,
    composeSwap,
    getTransferEndpoint: (): string => `${resolveBaseUrl()}${TRANSFER_PATH}`,
    getSwapEndpoint: (): string => `${resolveBaseUrl()}${SWAP_PATH}`
  };
};

const defaultClient = createActionsClient();

export const getTransferActionMetadata = (): Promise<ActionGetResponse> =>
  defaultClient.getTransferMetadata();

export const composeTransferAction = (
  payload: Record<string, unknown>
): Promise<TransferComposeResponse> => defaultClient.composeTransfer(payload);

export const getTransferActionEndpoint = (): string => defaultClient.getTransferEndpoint();

export const getSwapActionMetadata = (): Promise<ActionGetResponse> =>
  defaultClient.getSwapMetadata();

export const composeSwapAction = (
  payload: Record<string, unknown>
): Promise<SwapComposeResponse> => defaultClient.composeSwap(payload);

export const getSwapActionEndpoint = (): string => defaultClient.getSwapEndpoint();
