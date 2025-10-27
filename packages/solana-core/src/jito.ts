import type { Commitment, Connection, VersionedTransaction } from "@solana/web3.js";

import { getConfiguredCommitment } from "./rpc.js";
import { simulateAndReport } from "./simulate.js";

type MaybeJitoBundleParams = {
  enabled: boolean;
  tipLamports: number;
  vtx: VersionedTransaction;
  connection: Connection;
  url?: string;
  maxTipLamports?: number;
  simulationCommitment?: Commitment;
};

const DEFAULT_TIP_CAP = 1_000_000; // 0.001 SOL

const encodeTransactionBase64 = (tx: VersionedTransaction): string => {
  const serialized = tx.serialize();
  const maybeBuffer = (globalThis as typeof globalThis & {
    Buffer?: { from(data: Uint8Array): { toString(encoding: "base64"): string } };
  }).Buffer;
  if (maybeBuffer) {
    return maybeBuffer.from(serialized).toString("base64");
  }

  if (typeof globalThis.btoa === "function") {
    let binary = "";
    serialized.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return globalThis.btoa(binary);
  }

  throw new Error("No base64 encoder available for Jito bundle.");
};

const resolveJitoUrl = (explicit?: string): string | null => {
  if (explicit) {
    return explicit;
  }
  const env = typeof process !== "undefined" ? process.env ?? {} : {};
  const fromEnv = env.FARTNODE_JITO_URL ?? env.JITO_BUNDLE_URL;
  return fromEnv?.trim().length ? fromEnv.trim() : null;
};

export const maybeJitoBundleSend = async ({
  enabled,
  tipLamports,
  vtx,
  connection,
  url: explicitUrl,
  maxTipLamports = DEFAULT_TIP_CAP,
  simulationCommitment
}: MaybeJitoBundleParams): Promise<{ signature: string } | null> => {
  if (!enabled) {
    return null;
  }

  const jitoUrl = resolveJitoUrl(explicitUrl);
  if (!jitoUrl) {
    console.warn("[solana-core] Jito bundle skipped: URL not configured");
    return null;
  }

  if (!Number.isFinite(tipLamports) || tipLamports <= 0) {
    console.warn("[solana-core] Jito bundle skipped: invalid tip");
    return null;
  }

  if (tipLamports > maxTipLamports) {
    throw new Error(`Jito tip exceeds cap (${tipLamports} > ${maxTipLamports})`);
  }

  await simulateAndReport(connection, vtx, {
    commitment: simulationCommitment ?? getConfiguredCommitment("read")
  });

  const encodedTx = encodeTransactionBase64(vtx);

  const response = await fetch(jitoUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `fartnode-${Date.now()}`,
      method: "sendBundle",
      params: [
        [encodedTx],
        {
          tipLamports: Math.trunc(tipLamports)
        }
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Jito bundle request failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as {
    result?: string;
    error?: { message?: string };
  };

  if (payload.error) {
    throw new Error(`Jito bundle error: ${payload.error.message ?? "unknown error"}`);
  }

  if (!payload.result) {
    throw new Error("Jito bundle response missing signature result");
  }

  console.info(
    "[solana-core] Jito bundle dispatched",
    JSON.stringify({
      tipLamports,
      url: jitoUrl
    })
  );

  return { signature: payload.result };
};
