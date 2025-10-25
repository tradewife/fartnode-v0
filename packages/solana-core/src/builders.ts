import {
  AddressLookupTableAccount,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction
} from "@solana/web3.js";

export type BuildVersionedTransactionParams = {
  payer: PublicKey;
  instructions: ReadonlyArray<TransactionInstruction>;
  blockhash: string;
  lookupTables?: ReadonlyArray<AddressLookupTableAccount>;
};

export const buildVersionedTransaction = ({
  payer,
  instructions,
  blockhash,
  lookupTables = []
}: BuildVersionedTransactionParams): VersionedTransaction => {
  const instructionList = Array.from(instructions);
  const lookupTableList = Array.from(lookupTables);
  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions: instructionList
  }).compileToV0Message(lookupTableList);

  return new VersionedTransaction(message);
};

export const buildVersionedTx = (params: BuildVersionedTransactionParams): VersionedTransaction =>
  buildVersionedTransaction(params);

const ZERO_SIGNATURE = new Uint8Array(64).fill(0);

const ensureSignatures = (tx: VersionedTransaction): void => {
  if (tx.signatures.length === 0) {
    tx.signatures = [Uint8Array.from(ZERO_SIGNATURE)];
    return;
  }

  tx.signatures = tx.signatures.map((sig) =>
    sig?.length === ZERO_SIGNATURE.length ? sig : Uint8Array.from(ZERO_SIGNATURE)
  );
};

export const serializeTransaction = (tx: VersionedTransaction): Uint8Array => {
  ensureSignatures(tx);
  return tx.serialize();
};

const toBase64 = (data: Uint8Array): string => {
  const maybeBuffer = (globalThis as { Buffer?: { from(data: Uint8Array): { toString(encoding: "base64"): string } } })
    .Buffer;

  if (maybeBuffer) {
    return maybeBuffer.from(data).toString("base64");
  }

  if (typeof globalThis.btoa === "function") {
    let binary = "";
    data.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return globalThis.btoa(binary);
  }

  throw new Error("No base64 encoder available");
};

export const serializeTransactionBase64 = (tx: VersionedTransaction): string =>
  toBase64(serializeTransaction(tx));
