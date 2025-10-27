/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
  getTransferActionEndpoint: vi.fn().mockReturnValue(
    "https://example.dev/api/actions/transfer-sol"
  ),
  getTransferActionMetadata: vi.fn().mockResolvedValue({
    title: "Transfer SOL",
    description: "Demo metadata",
    icon: "https://example/icon.png",
    label: "Transfer",
    links: { actions: [] }
  }),
  composeTransferAction: vi.fn(),
  getBaseUrl: vi.fn().mockReturnValue("https://example.dev"),
  postCompose: vi.fn().mockResolvedValue({
    transaction: "",
    simulationLogs: []
  })
}));

import App from "./App";

describe("App", () => {
  it("defaults to the Vibe Studio tab and can switch to Blink demo", async () => {
    render(<App />);

    expect(screen.getByText(/Fartnode — Vibe Coding Studio/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /vibe studio/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /blink demo/i }));

    expect(await screen.findByRole("button", { name: /connect wallet/i })).toBeInTheDocument();
  });
});
