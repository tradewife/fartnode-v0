import type { Commitment, Connection, VersionedTransaction } from "@solana/web3.js";

import { getFreshBlockhash, isBlockhashValid } from "./blockhash.js";
import { connectionToExplorerUrl } from "./rpc.js";
import type { BlockhashWithExpiry, SendWithRetryParams, SendWithRetryResult } from "./types.js";

const getConnectionEndpoint = (connection: Connection): string => {
  const endpoint = (connection as unknown as { rpcEndpoint?: string }).rpcEndpoint;
  return endpoint ?? "unknown";
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const sendWithRetry = async ({
  connection,
  vtx,
  maxRetries = 2,
  commitment,
  lastValidBlockHeight,
  resign,
  refreshBlockhash
}: SendWithRetryParams): Promise<SendWithRetryResult> => {
  const endpoint = getConnectionEndpoint(connection);
  let retries = 0;
  let transaction = vtx;

  if (!lastValidBlockHeight || lastValidBlockHeight <= 0) {
    throw new Error("lastValidBlockHeight is required for sendWithRetry");
  }

  let blockhashInfo: BlockhashWithExpiry = {
    blockhash: transaction.message.recentBlockhash,
    lastValidBlockHeight,
    commitment,
    endpoint
  };

  const refresh = async (): Promise<void> => {
    const refresher =
      refreshBlockhash ?? (() => getFreshBlockhash({ connection, commitment, purpose: "send" }));
    const next = await refresher();
    if (!resign) {
      throw new Error("Blockhash expired but no resign function provided.");
    }
    transaction = await resign({
      blockhash: next.blockhash,
      lastValidBlockHeight: next.lastValidBlockHeight
    });
    blockhashInfo = next;
  };

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const stillValid = await isBlockhashValid(blockhashInfo.blockhash, blockhashInfo.lastValidBlockHeight, {
      connection,
      commitment,
      purpose: "send"
    });

    if (!stillValid) {
      console.warn("[solana-core] Blockhash expired prior to send, refreshing");
      await refresh();
    }

    try {
      const rawTx = transaction.serialize();
      const signature = await connection.sendRawTransaction(rawTx, {
        preflightCommitment: commitment,
        maxRetries: 0
      });

      await connection.confirmTransaction(
        {
          signature,
          blockhash: blockhashInfo.blockhash,
          lastValidBlockHeight: blockhashInfo.lastValidBlockHeight
        },
        commitment
      );

      const explorerUrl = connectionToExplorerUrl(signature, endpoint);

      console.info(
        "[solana-core] Transaction confirmed",
        JSON.stringify({
          signature,
          endpoint,
          commitment,
          retries
        })
      );

      return {
        signature,
        explorerUrl,
        retries
      };
    } catch (error) {
      console.warn("[solana-core] sendRawTransaction failed", error);
      if (retries >= maxRetries) {
        throw error;
      }
      retries += 1;
      await sleep(Math.min(500 * retries, 2_000));
    }
  }
};
