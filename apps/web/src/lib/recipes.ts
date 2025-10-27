export type BuildRecipe = {
  id: string;
  title: string;
  subtitle: string;
  kind: "transfer" | "memo" | "server-composer";
};

export type BuildPlan = {
  kind: BuildRecipe["kind"];
  endpoint: string;
  steps: string[];
};

const resolveWorkerBase = (): string => {
  const base = import.meta.env.VITE_ACTION_WORKER_URL || "http://127.0.0.1:8787";
  try {
    const parsed = new URL(base);
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return base.replace(/\/+$/, "");
  }
};

export const RECIPES: Record<string, BuildRecipe> = {
  transfer: {
    id: "transfer",
    title: "Transfer (wallet-signed)",
    subtitle: "Signable, simple send",
    kind: "transfer"
  },
  memo: {
    id: "memo",
    title: "Memo Blink",
    subtitle: "Wallet-signed memo",
    kind: "server-composer"
  },
  airdrop: {
    id: "airdrop",
    title: "Devnet Airdrop",
    subtitle: "Server-side example",
    kind: "server-composer"
  }
};

export const makePlan = (vibe: string, recipe: BuildRecipe): BuildPlan => {
  const baseUrl = resolveWorkerBase();
  const trimmedVibe = vibe.trim();

  const vibeSummary = trimmedVibe ? `Align to vibe: ${trimmedVibe}` : "Gather requirements";

  const plans: Record<string, BuildPlan> = {
    transfer: {
      kind: "transfer",
      endpoint: "/na",
      steps: [
        vibeSummary,
        "Use wallet to sign a simple transfer",
        "Simulate locally then send",
        "Display explorer link and share"
      ]
    },
    memo: {
      kind: "server-composer",
      endpoint: `${baseUrl}/api/solana/devnet-airdrop`,
      steps: [
        vibeSummary,
        "Fetch metadata & composer from Worker",
        "Decode base64 VersionedTransaction",
        "Simulate-first (server logs) and sign"
      ]
    },
    airdrop: {
      kind: "server-composer",
      endpoint: `${baseUrl}/api/solana/devnet-airdrop`,
      steps: [
        vibeSummary,
        "Devnet server composer (airdrop example)",
        "Simulate-first then sign Memo/No-op"
      ]
    }
  };

  return plans[recipe.id] ?? plans.transfer;
};
