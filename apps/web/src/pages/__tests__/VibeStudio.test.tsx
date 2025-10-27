/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, it, vi, expect } from "vitest";
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

vi.mock("../../lib/actionsClient", () => ({
  getBaseUrl: vi.fn().mockReturnValue("https://example.dev"),
  postCompose: vi.fn().mockResolvedValue({
    transaction: "",
    simulationLogs: []
  })
}));

import VibeStudio from "../VibeStudio";

describe("VibeStudio", () => {
  it("renders the studio UI", () => {
    render(<VibeStudio />);
    expect(screen.getByText(/Templates/i)).toBeInTheDocument();
  });
});
