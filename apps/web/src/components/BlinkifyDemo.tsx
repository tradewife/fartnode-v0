import { useCallback, useEffect, useMemo, useState } from "react";
import { VersionedTransaction } from "@solana/web3.js";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

import {
  getDevnetAirdropEndpoint,
  getDevnetAirdropMetadata,
  requestDevnetAirdrop,
  type ActionMetadata,
  type DevnetAirdropResponse
} from "../lib/actionsClient";
import { SimulateLogs } from "./SimulateLogs";

const ACTION_POST_COPY =
  "Share this endpoint with Blink surfaces. It composes a Devnet airdrop transaction.";

const decodeTransaction = (serialized: string): VersionedTransaction => {
  const atobImpl = globalThis.atob;
  if (!atobImpl) {
    throw new Error("Base64 decoding is not supported in this environment.");
  }
  const bytes = Uint8Array.from(atobImpl(serialized), (char) => char.charCodeAt(0));
  return VersionedTransaction.deserialize(bytes);
};

const explorerLink = (signature: string, network: string): string =>
  `https://explorer.solana.com/tx/${signature}?cluster=${encodeURIComponent(network)}`;

const solanaFmLink = (signature: string, network: string): string =>
  `https://solana.fm/tx/${signature}?cluster=${encodeURIComponent(`${network}-solana`)}`;

export const BlinkifyDemo = (): JSX.Element => {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const [metadata, setMetadata] = useState<ActionMetadata | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  const [amountSol, setAmountSol] = useState("1");
  const [isComposing, setIsComposing] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [composeResponse, setComposeResponse] = useState<DevnetAirdropResponse | null>(null);
  const [transactionBase64, setTransactionBase64] = useState<string | null>(null);

  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const [actionEndpoint, setActionEndpoint] = useState<string | null>(null);
  const [endpointError, setEndpointError] = useState<string | null>(null);

  const loadMetadata = useCallback(async () => {
    setMetadataLoading(true);
    setMetadataError(null);
    try {
      const result = await getDevnetAirdropMetadata();
      setMetadata(result);
    } catch (error) {
      setMetadataError((error as Error).message);
    } finally {
      setMetadataLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMetadata();
    try {
      setActionEndpoint(getDevnetAirdropEndpoint());
    } catch (error) {
      setEndpointError((error as Error).message);
    }
  }, [loadMetadata]);

  const handleCompose = useCallback(async () => {
    if (!publicKey) {
      setComposeError("Connect a wallet before composing.");
      return;
    }

    setComposeError(null);
    setSendError(null);
    setSignature(null);
    setIsComposing(true);

    try {
      let parsedAmount: number | undefined;
      if (amountSol.trim() !== "") {
        const numeric = Number(amountSol);
        if (!Number.isNaN(numeric)) {
          parsedAmount = numeric;
        }
      }
      const result = await requestDevnetAirdrop({
        publicKey: publicKey.toBase58(),
        amountSol: parsedAmount
      });

      setComposeResponse(result);
      setTransactionBase64(result.transaction);
    } catch (error) {
      setComposeResponse(null);
      setTransactionBase64(null);
      setComposeError((error as Error).message);
    } finally {
      setIsComposing(false);
    }
  }, [amountSol, publicKey]);

  const handleSend = useCallback(async () => {
    if (!publicKey) {
      setSendError("Connect a wallet before sending.");
      return;
    }

    if (!transactionBase64) {
      setSendError("Compose a transaction first.");
      return;
    }

    setSendError(null);
    setIsSending(true);

    try {
      const versioned = decodeTransaction(transactionBase64);
      const sig = await sendTransaction(versioned, connection);
      setSignature(sig);
    } catch (error) {
      setSignature(null);
      setSendError((error as Error).message);
    } finally {
      setIsSending(false);
    }
  }, [connection, publicKey, sendTransaction, transactionBase64]);

  const disableCompose = !publicKey || isComposing;
  const disableSend = !publicKey || !transactionBase64 || isSending;

  const signatureLinks = useMemo(() => {
    if (!signature || !composeResponse) {
      return null;
    }

    const { network } = composeResponse;
    return {
      explorer: explorerLink(signature, network),
      solanaFm: solanaFmLink(signature, network)
    };
  }, [composeResponse, signature]);

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
          <h2 style={{ margin: 0 }}>Blinkify the Devnet Airdrop</h2>
          <p style={{ margin: 0, color: "#64748b" }}>
            Connect Phantom or Solflare on devnet, compose, simulate, then send.
          </p>
        </div>
        <WalletMultiButton style={{ background: "#6366f1" }} />
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <strong>Wallet:</strong>{" "}
        {publicKey ? publicKey.toBase58() : "Not connected"}
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
          <p style={{ color: "#dc2626", marginTop: "0.75rem" }}>{metadataError}</p>
        ) : null}
        {metadata ? (
          <div style={{ marginTop: "1rem" }}>
            <h3 style={{ marginBottom: "0.5rem" }}>{metadata.title}</h3>
            <p style={{ marginTop: 0, color: "#475569" }}>{metadata.description}</p>
            <ul style={{ paddingLeft: "1.25rem", margin: 0 }}>
              {metadata.inputs.map((input) => (
                <li key={input.name}>
                  <code>{input.name}</code> ({input.type})
                  {input.required ? " • required" : " • optional"}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleCompose();
        }}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          marginBottom: "1.5rem"
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <span style={{ fontWeight: 600 }}>
            Amount (SOL) — optional, worker clamps to devnet safe values
          </span>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            value={amountSol}
            onChange={(event) => setAmountSol(event.target.value)}
            style={{
              padding: "0.75rem",
              borderRadius: "0.5rem",
              border: "1px solid rgba(148, 163, 184, 0.8)",
              fontSize: "1rem"
            }}
          />
        </label>

        <button
          type="submit"
          disabled={disableCompose}
          style={{
            padding: "0.85rem 1rem",
            borderRadius: "0.75rem",
            border: "none",
            fontSize: "1rem",
            fontWeight: 600,
            background: disableCompose ? "rgba(148,163,184,0.6)" : "#6366f1",
            color: "#ffffff"
          }}
        >
          {isComposing ? "Composing..." : "Compose Devnet transaction"}
        </button>
      </form>

      {composeError ? <p style={{ color: "#dc2626" }}>{composeError}</p> : null}

      {composeResponse ? (
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ marginTop: 0, color: "#475569" }}>{composeResponse.message}</p>
          {composeResponse.simulateFirst ? (
            <p style={{ marginTop: "0.5rem", color: "#0ea5e9" }}>
              Simulation recommended — review the logs below before sending.
            </p>
          ) : null}
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={disableSend}
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "0.75rem",
                border: "none",
                fontWeight: 600,
                background: disableSend ? "rgba(148,163,184,0.6)" : "#0ea5e9",
                color: "#0f172a"
              }}
            >
              {isSending ? "Sending..." : "Sign and send"}
            </button>
          </div>
          {sendError ? <p style={{ color: "#dc2626" }}>{sendError}</p> : null}
        </div>
      ) : null}

      {signatureLinks ? (
        <div style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ marginBottom: "0.25rem" }}>Transaction signature</h3>
          <p style={{ marginTop: 0 }}>
            <a href={signatureLinks.explorer} target="_blank" rel="noreferrer">
              View on Solana Explorer
            </a>{" "}
            ·{" "}
            <a href={signatureLinks.solanaFm} target="_blank" rel="noreferrer">
              View on SolanaFM
            </a>
          </p>
        </div>
      ) : null}

      <SimulateLogs logs={composeResponse?.simulationLogs} />

      <section
        style={{
          marginTop: "1.5rem",
          padding: "1rem",
          borderRadius: "0.75rem",
          border: "1px dashed rgba(99,102,241,0.45)",
          background: "rgba(99,102,241,0.08)"
        }}
      >
        <h3 style={{ marginTop: 0 }}>Blink share URL</h3>
        {endpointError ? (
          <p style={{ color: "#dc2626" }}>{endpointError}</p>
        ) : (
          <>
            <code style={{ display: "block", marginBottom: "0.75rem" }}>
              {actionEndpoint}
            </code>
            <p style={{ margin: 0, color: "#475569" }}>{ACTION_POST_COPY}</p>
          </>
        )}
      </section>
    </section>
  );
};
