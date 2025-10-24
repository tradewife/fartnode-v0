export type ActionInput = {
  publicKey: string;
  amountSol?: number;
};

export type ActionMetadata = {
  title: string;
  description: string;
  icon?: string;
  inputs: Array<{
    name: string;
    type: "string" | "number";
    required?: boolean;
    default?: unknown;
  }>;
};

export type ComposeResult = {
  transactionBase64: string;
  network: "devnet" | "testnet";
  simulateFirst: true;
};
