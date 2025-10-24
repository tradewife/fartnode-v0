import {
  AddressLookupTableAccount,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction
} from "@solana/web3.js";

type BuildVersionedTxParams = {
  payer: PublicKey;
  ixs: TransactionInstruction[];
  blockhash: string;
  lookupTables?: AddressLookupTableAccount[];
};

export const buildVersionedTx = ({
  payer,
  ixs,
  blockhash,
  lookupTables = []
}: BuildVersionedTxParams): VersionedTransaction => {
  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions: ixs
  }).compileToV0Message(lookupTables);

  return new VersionedTransaction(message);
};
