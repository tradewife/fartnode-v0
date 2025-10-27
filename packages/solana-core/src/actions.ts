import {
  createActionHeaders,
  createPostResponse,
  encodeURL,
  type ActionGetResponse,
  type ActionParameter,
  type ActionParameterType,
  type ActionPostResponse,
  type LinkedAction
} from "@solana/actions";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const IDENTITY_MEMO_PREFIX = "fartnode.identity";

export const ACTIONS_CORS_HEADERS = createActionHeaders();

type ActionLinkConfig = {
  href: string;
  label: string;
  type?: LinkedAction["type"];
  parameters?: Array<ActionParameter<ActionParameterType>>;
};

type BuildActionGetConfig = {
  title: string;
  description: string;
  icon: string;
  label: string;
  action: ActionLinkConfig;
  disabled?: boolean;
  errorMessage?: string;
  related?: LinkedAction[];
};

const normalizeLink = (href: string): string => {
  try {
    const url = new URL(href);
    return url.toString();
  } catch {
    return href;
  }
};

export const buildActionGetResponse = ({
  title,
  description,
  icon,
  label,
  action,
  disabled,
  errorMessage,
  related = []
}: BuildActionGetConfig): ActionGetResponse => {
  const actionLink: LinkedAction = {
    type: action.type ?? "transaction",
    href: normalizeLink(action.href),
    label: action.label,
    parameters: action.parameters as LinkedAction["parameters"]
  };

  return {
    type: "action",
    icon,
    title,
    description,
    label,
    disabled,
    error: errorMessage ? { message: errorMessage } : undefined,
    links: {
      actions: [actionLink, ...related]
    }
  };
};

type BuildPostResponseParams = {
  transaction: Parameters<typeof createPostResponse>[0]["fields"]["transaction"];
  message?: string;
  links?: ActionPostResponse["links"];
  simulateFirst?: boolean;
  simulationLogs?: string[];
};

export const buildTransactionPostResponse = async ({
  transaction,
  message,
  links,
  simulateFirst = true,
  simulationLogs
}: BuildPostResponseParams): Promise<ActionPostResponse & { simulateFirst: boolean; simulationLogs?: string[] }> => {
  const response = await createPostResponse({
    fields: {
      type: "transaction",
      transaction,
      message,
      links
    }
  });

  return {
    ...response,
    simulateFirst,
    simulationLogs
  };
};

type BlinkUrlParams = {
  blinkBaseUrl: string;
  actionUrl: string;
  label?: string;
  message?: string;
};

export const renderBlinkUrl = ({ blinkBaseUrl, actionUrl, label, message }: BlinkUrlParams): string => {
  const blinkUrl = new URL(blinkBaseUrl);
  const actionLink = new URL(actionUrl);
  const encoded = encodeURL(
    {
      blink: blinkUrl,
      action: {
        link: actionLink,
        label,
        message
      }
    },
    "solana-action:"
  );

  return encoded.toString();
};

const identityEnvKeys = ["FARTNODE_ACTION_IDENTITY_MEMO", "FARTNODE_ACTION_IDENTITY_PUBKEY"];

const resolveIdentityMemo = (): string | null => {
  const env = typeof process !== "undefined" ? process.env ?? {} : {};
  for (const key of identityEnvKeys) {
    const value = env[key];
    if (value && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
};

const textEncoder = new TextEncoder();

const encodeMemoData = (payload: string): Uint8Array | Buffer => {
  const data = textEncoder.encode(payload);
  const maybeBuffer = (globalThis as typeof globalThis & {
    Buffer?: { from(input: Uint8Array): Buffer };
  }).Buffer;

  if (maybeBuffer) {
    return maybeBuffer.from(data);
  }

  return data;
};

export const maybeCreateIdentityMemoInstruction = (
  memoOverride?: string
): TransactionInstruction | null => {
  const memoValue = memoOverride ?? resolveIdentityMemo();
  if (!memoValue) {
    return null;
  }

  const payload = `${IDENTITY_MEMO_PREFIX}:${memoValue}`;
  return new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [],
    data: encodeMemoData(payload) as unknown as Buffer
  });
};
