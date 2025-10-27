import type { Commitment, Connection } from "@solana/web3.js";

import { getConfiguredCommitment, selectRpc } from "./rpc.js";
import type { BlockhashWithExpiry, RpcPurpose } from "./types.js";

const BLOCK_HEIGHT_BUFFER = 2;

type BlockhashParams = {
  connection?: Connection;
  commitment?: Commitment;
  purpose?: RpcPurpose;
};

const resolveEndpointForConnection = (connection: Connection): string => {
  const rpcEndpoint = (connection as unknown as { rpcEndpoint?: string }).rpcEndpoint;
  return rpcEndpoint ?? "unknown";
};

export const getFreshBlockhash = async ({
  connection: maybeConnection,
  commitment: maybeCommitment,
  purpose: maybePurpose
}: BlockhashParams = {}): Promise<BlockhashWithExpiry> => {
  const purpose: RpcPurpose = maybePurpose ?? "send";
  const commitment = maybeCommitment ?? getConfiguredCommitment(purpose);
  const connection =
    maybeConnection ??
    (await selectRpc(commitment, purpose));

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash({
    commitment
  });

  const endpoint = resolveEndpointForConnection(connection);

  console.info(
    `[solana-core] fetched blockhash`,
    JSON.stringify({ blockhash, lastValidBlockHeight, commitment, endpoint })
  );

  return {
    blockhash,
    lastValidBlockHeight,
    commitment,
    endpoint
  };
};

type BlockhashValidityParams = BlockhashParams & {
  currentBlockHeight?: number;
};

export const isBlockhashValid = async (
  blockhash: string,
  lastValidBlockHeight: number,
  {
    connection: maybeConnection,
    commitment: maybeCommitment,
    purpose: maybePurpose,
    currentBlockHeight
  }: BlockhashValidityParams = {}
): Promise<boolean> => {
  if (!blockhash || lastValidBlockHeight <= 0) {
    return false;
  }

  const purpose: RpcPurpose = maybePurpose ?? "send";
  const commitment = maybeCommitment ?? getConfiguredCommitment(purpose);
  const connection =
    maybeConnection ??
    (await selectRpc(commitment, purpose));

  const blockHeight =
    currentBlockHeight ?? (await connection.getBlockHeight(commitment));

  const valid =
    blockHeight + BLOCK_HEIGHT_BUFFER <= lastValidBlockHeight;

  console.debug(
    `[solana-core] blockhash validation`,
    JSON.stringify({
      blockhash,
      lastValidBlockHeight,
      blockHeight,
      buffer: BLOCK_HEIGHT_BUFFER,
      valid
    })
  );

  return valid;
};
