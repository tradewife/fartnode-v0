interface VibePromptProps {
  value: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
}

export const VibePrompt = ({ value, onChange, onGenerate }: VibePromptProps): JSX.Element => {
  return (
    <div className="rounded-2xl p-4 bg-neutral-900 border border-neutral-800" style={{ background: "#0f172a", borderRadius: "1.25rem", border: "1px solid rgba(148, 163, 184, 0.35)", padding: "1.5rem" }}>
      <label className="block text-sm mb-2 text-neutral-400" style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.5rem", color: "#94a3b8" }}>
        Describe your vibe (e.g., "Simple paywall mint with memo")
      </label>
      <textarea
        className="w-full h-24 p-3 rounded bg-neutral-950 border border-neutral-800 focus:outline-none"
        style={{ width: "100%", minHeight: "6rem", padding: "0.75rem", borderRadius: "1rem", border: "1px solid rgba(148, 163, 184, 0.3)", background: "#020617", color: "#e2e8f0" }}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="I want a transfer action with logs and a shareable Blink."
      />
      <div className="mt-3 flex justify-end" style={{ marginTop: "0.75rem", display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={onGenerate}
          className="px-4 py-2 rounded bg-violet-600 hover:bg-violet-700"
          style={{ padding: "0.5rem 1.25rem", borderRadius: "0.75rem", background: "#7c3aed", color: "white", border: "none", fontWeight: 600 }}
        >
          Generate Plan
        </button>
      </div>
    </div>
  );
};
