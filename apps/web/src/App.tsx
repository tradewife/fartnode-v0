import { useState, type CSSProperties } from "react";
import VibeStudio from "./pages/VibeStudio";
import { BlinkifyDemo } from "./components/BlinkifyDemo";
import { WalletProviders } from "./wallet/WalletContext";

const App = (): JSX.Element => {
  const [tab, setTab] = useState<"studio" | "blink">("studio");

  const buttonStyle = (active: boolean): CSSProperties => ({
    padding: "0.5rem 0.75rem",
    borderRadius: "0.5rem",
    border: "1px solid",
    borderColor: active ? "#7c3aed" : "rgba(148, 163, 184, 0.3)",
    backgroundColor: active ? "rgba(124, 58, 237, 0.16)" : "rgba(148, 163, 184, 0.08)",
    color: "#e2e8f0",
    fontWeight: active ? 600 : 500
  });

  return (
    <WalletProviders>
      <div className="min-h-screen bg-neutral-950 text-white">
        <main className="max-w-4xl mx-auto py-10" style={{ maxWidth: "960px", margin: "0 auto", padding: "2rem" }}>
          <h1 className="text-3xl font-bold mb-6" style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1.5rem" }}>
            Fartnode — Vibe Coding Studio
          </h1>
          <div className="flex gap-2 mb-6" style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
            <button type="button" className={`px-3 py-2 rounded ${tab === "studio" ? "bg-violet-600" : "bg-violet-600/20"}`} style={buttonStyle(tab === "studio")} onClick={() => setTab("studio")}>
              Vibe Studio
            </button>
            <button type="button" className={`px-3 py-2 rounded ${tab === "blink" ? "bg-violet-600" : "bg-violet-600/20"}`} style={buttonStyle(tab === "blink")} onClick={() => setTab("blink")}>
              Blink Demo
            </button>
          </div>
          {tab === "studio" ? <VibeStudio /> : <BlinkifyDemo />}
        </main>
      </div>
    </WalletProviders>
  );
};

export default App;
