import { describe, it, expect, vi } from "vitest";

import { createActionsClient } from "./actionsClient";

const BASE_URL = "https://worker.example";
const ENDPOINT = `${BASE_URL}/api/solana/devnet-airdrop`;

const createResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });

describe("actionsClient", () => {
  it("fetches action metadata", async () => {
    const metadata = {
      title: "Demo action",
      description: "Example metadata",
      inputs: [{ name: "publicKey", type: "string", required: true }]
    };
    const fetchMock = vi.fn().mockResolvedValue(createResponse(metadata));
    const client = createActionsClient(BASE_URL, fetchMock);

    await expect(client.getMetadata()).resolves.toStrictEqual(metadata);
    expect(fetchMock).toHaveBeenCalledWith(
      ENDPOINT,
      expect.objectContaining({ method: "GET" })
    );
  });

  it("composes a transaction with provided payload", async () => {
    const composeResult = {
      transaction: "BASE64",
      message: "Simulate first",
      network: "devnet",
      simulateFirst: true,
      simulationLogs: ["log 1"]
    };
    const fetchMock = vi.fn().mockResolvedValue(createResponse(composeResult));
    const client = createActionsClient(BASE_URL, fetchMock);

    await expect(
      client.composeTransaction({ publicKey: "ExamplePublicKey", amountSol: 1 })
    ).resolves.toStrictEqual(composeResult);

    expect(fetchMock).toHaveBeenCalledWith(
      ENDPOINT,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ publicKey: "ExamplePublicKey", amountSol: 1 })
      })
    );
  });

  it("throws when publicKey is missing", async () => {
    const fetchMock = vi.fn();
    const client = createActionsClient(BASE_URL, fetchMock);

    await expect(client.composeTransaction({ publicKey: "" })).rejects.toThrow(
      "publicKey is required"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("errors on non-ok responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(createResponse({ error: "nope" }, 500));
    const client = createActionsClient(BASE_URL, fetchMock);

    await expect(
      client.composeTransaction({ publicKey: "ExamplePublicKey" })
    ).rejects.toThrow("nope");
  });
});
