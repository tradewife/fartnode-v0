import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  VersionedTransaction,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  type TransactionSignature
} from "@solana/web3.js";
import { getBaseUrl, postCompose } from "../lib/actionsClient";
import type { BuildPlan } from "../lib/recipes";

interface LiveActionPreviewProps {
  plan: BuildPlan | null;
}

const decodeBase64Transaction = (serialized: string): VersionedTransaction => {
  const atobImpl = globalThis.atob;
  if (!atobImpl) {
    throw new Error("Base64 decoding is not available.");
  }
  const bytes = Uint8Array.from(atobImpl(serialized), (char) => char.charCodeAt(0));
  return VersionedTransaction.deserialize(bytes);
};

export const LiveActionPreview = ({ plan }: LiveActionPreviewProps): JSX.Element | null => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("0.1");
  const [logs, setLogs] = useState<string[] | null>(null);
  const [signature, setSignature] = useState<TransactionSignature | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!plan) {
    return null;
  }

  const composeAndSend = async (): Promise<void> => {
    setError(null);
    setLogs(null);
    setSignature(null);
    setPending(true);

    try {
      if (!publicKey) {
        throw new Error("Connect a wallet to continue.");
      }

      const parsedAmount = Number(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Enter a positive SOL amount.");
      }

      if (plan.kind === "transfer") {
        if (!recipient) {
          throw new Error("Enter a recipient address.");
        }

        const toPubkey = new PublicKey(recipient.trim());
        const { blockhash } = await connection.getLatestBlockhash();
        const lamports = Math.floor(parsedAmount * 1e9);
        const transferIx = SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey,
          lamports
        });
        const messageV0 = new TransactionMessage({
          payerKey: publicKey,
          recentBlockhash: blockhash,
          instructions: [transferIx]
        }).compileToV0Message();
        const unsigned = new VersionedTransaction(messageV0);

        const simulation = await connection.simulateTransaction(unsigned, { sigVerify: false });
        setLogs(simulation.value.logs ?? ["(no logs)"]);

        const submittedSignature = await sendTransaction(unsigned, connection);
        setSignature(submittedSignature);
        return;
      }

      const baseUrl = getBaseUrl();
      const composePayload = {
        publicKey: publicKey.toBase58(),
        amountSol: parsedAmount,
        recipient: recipient || publicKey.toBase58()
      };
      const response = await postCompose(baseUrl, plan.endpoint, composePayload);
      if (response.simulationLogs) {
        setLogs(response.simulationLogs);
      }

      const versioned = decodeBase64Transaction(response.transaction);
      const submittedSignature = await sendTransaction(versioned, connection);
      setSignature(submittedSignature);
    } catch (caught) {
      setError((caught as Error).message ?? String(caught));
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className="rounded-2xl p-4 bg-neutral-900 border border-neutral-800"
      style={{ background: "#0f172a", borderRadius: "1.25rem", border: "1px solid rgba(148, 163, 184, 0.35)", padding: "1.5rem" }}
    >
      <div className="text-sm text-neutral-400 mb-2" style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: "0.75rem" }}>
        Live Preview
      </div>

      {plan.kind === "transfer" ? (
        <div className="grid gap-2 md:grid-cols-3" style={{ display: "grid", gap: "0.75rem" }}>
          <input
            className="p-2 rounded bg-neutral-950 border border-neutral-800"
            style={{ padding: "0.65rem", borderRadius: "0.75rem", border: "1px solid rgba(148, 163, 184, 0.3)", background: "#020617", color: "#e2e8f0" }}
            placeholder="Recipient"
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
          />
          <input
            className="p-2 rounded bg-neutral-950 border border-neutral-800"
            style={{ padding: "0.65rem", borderRadius: "0.75rem", border: "1px solid rgba(148, 163, 184, 0.3)", background: "#020617", color: "#e2e8f0" }}
            placeholder="Amount SOL"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <button
            type="button"
            className="px-4 py-2 rounded bg-violet-600 hover:bg-violet-700"
            style={{ padding: "0.65rem 1rem", borderRadius: "0.85rem", background: "#7c3aed", color: "white", border: "none", fontWeight: 600 }}
            onClick={() => void composeAndSend()}
            disabled={pending}
          >
            {pending ? "Sending..." : "Compose & Send"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="mt-2 px-4 py-2 rounded bg-violet-600 hover:bg-violet-700"
          style={{ marginTop: "0.5rem", padding: "0.65rem 1rem", borderRadius: "0.85rem", background: "#7c3aed", color: "white", border: "none", fontWeight: 600 }}
          onClick={() => void composeAndSend()}
          disabled={pending}
        >
          {pending ? "Sending..." : "Compose via Worker & Send"}
        </button>
      )}

      {error && (
        <div className="mt-3 text-sm" style={{ color: "#fca5a5", marginTop: "0.75rem", fontSize: "0.9rem" }}>
          {error}
        </div>
      )}

      {logs && (
        <div
          className="mt-3 text-xs text-neutral-400"
          style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "#94a3b8" }}
        >
          <div className="font-semibold mb-1" style={{ fontWeight: 600, marginBottom: "0.35rem", color: "#e2e8f0" }}>
            Simulation Logs
          </div>
          <pre className="whitespace-pre-wrap" style={{ whiteSpace: "pre-wrap", margin: 0, fontFamily: "ui-monospace", color: "#cbd5f5" }}>
            {logs.join("\n")}
          </pre>
        </div>
      )}

      {signature && (
        <div className="mt-3 text-sm" style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}>
          Explorer: {" "}
          <a
            className="text-violet-400 underline"
            style={{ color: "#c4b5fd" }}
            href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
          >
            view transaction
          </a>
        </div>
      )}
    </div>
  );
};
