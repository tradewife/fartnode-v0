import { useCallback, useEffect, useMemo, useState } from "react";
import { VersionedTransaction } from "@solana/web3.js";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import type { ActionGetResponse } from "@solana/actions";

import {
  composeTransferAction,
  getTransferActionEndpoint,
  getTransferActionMetadata,
  type TransferComposeResponse
} from "../lib/actionsClient";
import { SimulateLogs } from "./SimulateLogs";

const decodeTransaction = (serialized: string): VersionedTransaction => {
  const atobImpl = globalThis.atob;
  if (!atobImpl) {
    throw new Error("Base64 decoding is not supported in this environment.");
  }
  const bytes = Uint8Array.from(atobImpl(serialized), (char) => char.charCodeAt(0));
  return VersionedTransaction.deserialize(bytes);
};

const ExplorerLink = ({ signature, network }: { signature: string; network: string }) => {
  const explorer = `https://explorer.solana.com/tx/${signature}?cluster=${encodeURIComponent(network)}`;
  return (
    <a href={explorer} target="_blank" rel="noreferrer" style={{ color: "#6366f1" }}>
      View on Solana Explorer
    </a>
  );
};

export const BlinkifyDemo = (): JSX.Element => {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const [metadata, setMetadata] = useState<ActionGetResponse | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  const [recipient, setRecipient] = useState("");
  const [amountSol, setAmountSol] = useState("0.5");
  const [memo, setMemo] = useState("");

  const [composePending, setComposePending] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [composeResponse, setComposeResponse] = useState<TransferComposeResponse | null>(null);
  const [transactionBase64, setTransactionBase64] = useState<string | null>(null);

  const [sendPending, setSendPending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const [actionEndpoint, setActionEndpoint] = useState<string | null>(null);
  const [endpointError, setEndpointError] = useState<string | null>(null);

  const loadMetadata = useCallback(async () => {
    setMetadataLoading(true);
    setMetadataError(null);
    try {
      const result = await getTransferActionMetadata();
      setMetadata(result);
    } catch (error) {
      setMetadata(null);
      setMetadataError((error as Error).message);
    } finally {
      setMetadataLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMetadata();
    try {
      setActionEndpoint(getTransferActionEndpoint());
    } catch (error) {
      setEndpointError((error as Error).message);
    }
  }, [loadMetadata]);

  const compose = useCallback(async () => {
    if (!publicKey) {
      setComposeError("Connect a wallet before composing.");
      return;
    }

    setComposeError(null);
    setSendError(null);
    setSignature(null);
    setComposePending(true);

    try {
      const payload = {
        account: publicKey.toBase58(),
        recipient: recipient.trim(),
        amountSol: Number(amountSol),
        memo: memo.trim() || undefined
      };
      const result = await composeTransferAction(payload);
      setComposeResponse(result);
      setTransactionBase64(result.transaction);
    } catch (error) {
      setComposeResponse(null);
      setTransactionBase64(null);
      setComposeError((error as Error).message);
    } finally {
      setComposePending(false);
    }
  }, [amountSol, memo, publicKey, recipient]);

  const send = useCallback(async () => {
    if (!publicKey) {
      setSendError("Connect a wallet before sending.");
      return;
    }
    if (!transactionBase64) {
      setSendError("Compose a transaction first.");
      return;
    }

    setSendError(null);
    setSendPending(true);

    try {
      const versioned = decodeTransaction(transactionBase64);
      const sig = await sendTransaction(versioned, connection);
      setSignature(sig);
    } catch (error) {
      setSignature(null);
      setSendError((error as Error).message);
    } finally {
      setSendPending(false);
    }
  }, [connection, publicKey, sendTransaction, transactionBase64]);

  const disableCompose = !publicKey || composePending;
  const disableSend = !publicKey || !transactionBase64 || sendPending;

  const meta = composeResponse?.meta as Record<string, unknown> | undefined;

  const network = useMemo(() => {
    if (!meta?.network) {
      return "confirmed";
    }
    return String(meta.network);
  }, [meta]);

  return (
    <section
      style={{
        background: "#ffffff",
        borderRadius: "1rem",
        padding: "1.75rem",
        boxShadow: "0 20px 45px rgba(15, 23, 42, 0.08)"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem"
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Institutional SOL Transfer (Blink)</h2>
          <p style={{ margin: 0, color: "#64748b" }}>
            Estimate fees, build compute budget, simulate, then hand off to your wallet.
          </p>
        </div>
        <WalletMultiButton style={{ background: "#6366f1" }} />
      </div>

      <div style={{ marginBottom: "1.25rem" }}>
        <strong>Wallet:</strong> {publicKey ? publicKey.toBase58() : "Not connected"}
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <button
          type="button"
          onClick={() => void loadMetadata()}
          disabled={metadataLoading}
          style={{
            padding: "0.5rem 0.85rem",
            borderRadius: "0.5rem",
            border: "1px solid rgba(99,102,241,0.45)",
            background: metadataLoading ? "rgba(99,102,241,0.35)" : "rgba(99,102,241,0.18)",
            fontWeight: 600
          }}
        >
          {metadataLoading ? "Refreshing metadata..." : "Refresh metadata"}
        </button>
        {metadataError ? (
          <span style={{ marginLeft: "0.75rem", color: "#dc2626" }}>{metadataError}</span>
        ) : metadata ? (
          <span style={{ marginLeft: "0.75rem", color: "#0f172a" }}>
            {metadata.title} — {metadata.description}
          </span>
        ) : null}
      </div>

      <div style={{ display: "grid", gap: "0.85rem", marginBottom: "1.5rem" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <span>Recipient address</span>
          <input
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            placeholder="Enter recipient"
            style={{ padding: "0.6rem", borderRadius: "0.5rem", border: "1px solid #cbd5f5" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <span>Amount (SOL)</span>
          <input
            value={amountSol}
            onChange={(event) => setAmountSol(event.target.value)}
            placeholder="1.0"
            type="number"
            min="0"
            step="0.0001"
            style={{ padding: "0.6rem", borderRadius: "0.5rem", border: "1px solid #cbd5f5" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <span>Memo (optional)</span>
          <input
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            placeholder="Institutional memo"
            style={{ padding: "0.6rem", borderRadius: "0.5rem", border: "1px solid #cbd5f5" }}
          />
        </label>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <button
          type="button"
          onClick={() => void compose()}
          disabled={disableCompose}
          style={{
            padding: "0.65rem 1.2rem",
            borderRadius: "0.5rem",
            border: "none",
            background: disableCompose ? "rgba(99,102,241,0.25)" : "#6366f1",
            color: "white",
            fontWeight: 600
          }}
        >
          {composePending ? "Composing..." : "Compose Action"}
        </button>
        <button
          type="button"
          onClick={() => void send()}
          disabled={disableSend}
          style={{
            padding: "0.65rem 1.2rem",
            borderRadius: "0.5rem",
            border: "1px solid rgba(15,23,42,0.15)",
            background: disableSend ? "rgba(15,23,42,0.05)" : "white",
            color: "#0f172a",
            fontWeight: 600
          }}
        >
          {sendPending ? "Sending..." : "Send via Wallet"}
        </button>
      </div>

      {composeError ? <p style={{ color: "#dc2626" }}>{composeError}</p> : null}
      {sendError ? <p style={{ color: "#dc2626" }}>{sendError}</p> : null}

      {composeResponse && (
        <div
          style={{
            border: "1px solid rgba(15,23,42,0.12)",
            borderRadius: "0.75rem",
            padding: "1.25rem",
            background: "rgba(241,245,249,0.45)",
            marginBottom: "1.5rem"
          }}
        >
          <h3 style={{ marginTop: 0 }}>Compose Result</h3>
          <ul style={{ listStyle: "disc", marginLeft: "1.5rem", color: "#0f172a" }}>
            <li>
              <strong>simulateFirst:</strong> {composeResponse.simulateFirst ? "true" : "false"}
            </li>
            {meta?.priorityFeeMicrolamports ? (
              <li>
                <strong>Priority fee:</strong> {String(meta.priorityFeeMicrolamports)} μ-lamports/CU
              </li>
            ) : null}
            {meta?.computeUnitLimit ? (
              <li>
                <strong>Compute limit:</strong> {String(meta.computeUnitLimit)} units
              </li>
            ) : null}
            {meta?.blockhash && meta?.lastValidBlockHeight ? (
              <li>
                <strong>Blockhash:</strong> {String(meta.blockhash)} (valid through height {String(meta.lastValidBlockHeight)})
              </li>
            ) : null}
            {meta?.blinkUrl ? (
              <li>
                <strong>Blink URL:</strong>{" "}
                <a href={String(meta.blinkUrl)} target="_blank" rel="noreferrer">
                  {String(meta.blinkUrl)}
                </a>
              </li>
            ) : null}
          </ul>

          {composeResponse.simulationLogs && composeResponse.simulationLogs.length > 0 ? (
            <SimulateLogs logs={composeResponse.simulationLogs} />
          ) : null}
        </div>
      )}

      {signature && <ExplorerLink signature={signature} network={network} />}

      <div style={{ marginTop: "2rem" }}>
        <h3>Action endpoint</h3>
        {endpointError ? (
          <p style={{ color: "#dc2626" }}>{endpointError}</p>
        ) : actionEndpoint ? (
          <code style={{
            display: "block",
            padding: "0.75rem",
            borderRadius: "0.5rem",
            background: "rgba(15,23,42,0.05)",
            color: "#0f172a"
          }}>
            {actionEndpoint}
          </code>
        ) : null}
      </div>
    </section>
  );
};
