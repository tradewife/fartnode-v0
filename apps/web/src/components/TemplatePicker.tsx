import { RECIPES, type BuildRecipe } from "../lib/recipes";

interface TemplatePickerProps {
  recipe: BuildRecipe | null;
  onChange: (recipe: BuildRecipe) => void;
}

export const TemplatePicker = ({ recipe, onChange }: TemplatePickerProps): JSX.Element => {
  return (
    <div
      className="rounded-2xl p-4 bg-neutral-900 border border-neutral-800"
      style={{ background: "#0f172a", borderRadius: "1.25rem", border: "1px solid rgba(148, 163, 184, 0.35)", padding: "1.5rem" }}
    >
      <div className="text-sm text-neutral-400 mb-2" style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: "0.75rem" }}>
        Templates
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3" style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
        {Object.values(RECIPES).map((item) => {
          const isActive = recipe?.id === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item)}
              className={`p-3 rounded border ${isActive ? "border-violet-500 bg-violet-500/10" : "border-neutral-800 bg-neutral-950 hover:border-neutral-700"}`}
              style={{
                padding: "1rem",
                textAlign: "left",
                borderRadius: "1rem",
                border: isActive ? "1px solid #8b5cf6" : "1px solid rgba(148, 163, 184, 0.3)",
                background: isActive ? "rgba(139, 92, 246, 0.12)" : "#020617",
                color: "#f8fafc"
              }}
            >
              <div className="text-sm font-semibold" style={{ fontSize: "0.95rem", fontWeight: 600 }}>
                {item.title}
              </div>
              <div className="text-xs text-neutral-400" style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.25rem" }}>
                {item.subtitle}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
