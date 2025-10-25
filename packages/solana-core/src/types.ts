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

export type ComposeInput = {
  publicKey: string;
  amountSol?: number;
};

export type ComposeResult = {
  transaction: string;
  network: "devnet" | "testnet";
  simulateFirst: true;
  message?: string;
  simulationLogs?: string[];
};

export type PriorityFeeConfig = {
  microLamports?: number;
  defaultMicroLamports?: number;
};

export type ComputeBudgetConfig = {
  units?: number;
  microLamports?: number;
};

export type ActionInput = ComposeInput;
