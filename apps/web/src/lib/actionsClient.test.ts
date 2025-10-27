import { describe, it, expect, vi } from "vitest";

import { createActionsClient } from "./actionsClient";

const BASE_URL = "https://worker.example";
const TRANSFER_ENDPOINT = `${BASE_URL}/api/actions/transfer-sol`;

const createResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });

describe("actionsClient", () => {
  it("fetches transfer metadata", async () => {
    const metadata = {
      title: "Transfer",
      description: "Example",
      icon: "https://example/icon.png",
      label: "Transfer",
      links: { actions: [] }
    };
    const fetchMock = vi.fn().mockResolvedValue(createResponse(metadata));
    const client = createActionsClient(BASE_URL, fetchMock);

    await expect(client.getTransferMetadata()).resolves.toStrictEqual(metadata);
    expect(fetchMock).toHaveBeenCalledWith(
      TRANSFER_ENDPOINT,
      expect.objectContaining({ method: "GET" })
    );
  });

  it("composes a transfer transaction with provided payload", async () => {
    const composeResult = {
      transaction: "BASE64",
      message: "Simulate first",
      type: "transaction",
      simulateFirst: true,
      meta: { priorityFeeMicrolamports: 1000 }
    };
    const fetchMock = vi.fn().mockResolvedValue(createResponse(composeResult));
    const client = createActionsClient(BASE_URL, fetchMock);

    await expect(
      client.composeTransfer({ account: "AccountKey", recipient: "Recipient", amountSol: 1 })
    ).resolves.toStrictEqual(composeResult);

    expect(fetchMock).toHaveBeenCalledWith(
      TRANSFER_ENDPOINT,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ account: "AccountKey", recipient: "Recipient", amountSol: 1 })
      })
    );
  });

  it("errors on non-ok responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(createResponse({ error: "nope" }, 500));
    const client = createActionsClient(BASE_URL, fetchMock);

    await expect(
      client.composeTransfer({ account: "AccountKey", recipient: "Recipient" })
    ).rejects.toThrow("nope");
  });

  it("normalizes the base URL when building endpoints", () => {
    const client = createActionsClient(`${BASE_URL}/`);
    expect(client.getTransferEndpoint()).toBe(TRANSFER_ENDPOINT);
  });
});
