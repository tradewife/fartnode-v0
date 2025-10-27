import type { BuildPlan as BuildPlanType } from "../lib/recipes";

interface BuildPlanProps {
  plan: BuildPlanType | null;
}

export const BuildPlan = ({ plan }: BuildPlanProps): JSX.Element | null => {
  if (!plan) {
    return null;
  }

  return (
    <div
      className="rounded-2xl p-4 bg-neutral-900 border border-neutral-800"
      style={{ background: "#0f172a", borderRadius: "1.25rem", border: "1px solid rgba(148, 163, 184, 0.35)", padding: "1.5rem" }}
    >
      <div className="text-sm text-neutral-400 mb-2" style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: "0.75rem" }}>
        Build Plan
      </div>
      <ul className="text-sm space-y-1" style={{ listStyle: "disc", paddingLeft: "1.5rem", color: "#f8fafc" }}>
        {plan.steps.map((step, index) => (
          <li key={`${step}-${index}`} style={{ marginBottom: "0.25rem" }}>
            {step}
          </li>
        ))}
      </ul>
      <div className="text-xs text-neutral-500 mt-2" style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.5rem" }}>
        Action endpoint: <code style={{ color: "#c084fc" }}>{plan.endpoint}</code>
      </div>
    </div>
  );
};
