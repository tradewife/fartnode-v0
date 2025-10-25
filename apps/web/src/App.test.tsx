/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { ReactNode } from "react";

vi.mock("@solana/wallet-adapter-react", () => ({
  ConnectionProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  WalletProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useConnection: () => ({ connection: {} }),
  useWallet: () => ({
    publicKey: null,
    sendTransaction: vi.fn()
  })
}));

vi.mock("@solana/wallet-adapter-react-ui", () => ({
  WalletModalProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  WalletMultiButton: ({
    children,
    ...props
  }: { children?: ReactNode } & Record<string, unknown>) => (
    <button type="button" {...props}>
      {children ?? "Connect wallet"}
    </button>
  )
}));

vi.mock("./lib/actionsClient", () => ({
  getDevnetAirdropEndpoint: vi.fn().mockReturnValue(
    "https://example.dev/api/solana/actions/devnet-airdrop"
  ),
  getDevnetAirdropMetadata: vi.fn().mockResolvedValue({
    title: "Devnet airdrop",
    description: "Demo metadata",
    inputs: []
  }),
  requestDevnetAirdrop: vi.fn()
}));

import App from "./App";

describe("App", () => {
  it("renders the Blinkify UI with a connect wallet button", async () => {
    render(<App />);

    expect(screen.getByText(/Fartnode Blinkify Demo/i)).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /connect wallet/i })).toBeInTheDocument();
  });
});
