import { useState } from "react";
import { VibePrompt } from "../components/VibePrompt";
import { TemplatePicker } from "../components/TemplatePicker";
import { BuildPlan } from "../components/BuildPlan";
import { LiveActionPreview } from "../components/LiveActionPreview";
import { makePlan, type BuildRecipe, type BuildPlan as BuildPlanType, RECIPES } from "../lib/recipes";

const DEFAULT_RECIPE = RECIPES.transfer;

const VibeStudio = (): JSX.Element => {
  const [vibe, setVibe] = useState("");
  const [recipe, setRecipe] = useState<BuildRecipe | null>(DEFAULT_RECIPE);
  const [plan, setPlan] = useState<BuildPlanType | null>(null);

  const handleGenerate = (): void => {
    const selectedRecipe = recipe ?? DEFAULT_RECIPE;
    setPlan(makePlan(vibe, selectedRecipe));
  };

  return (
    <div className="space-y-6" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <p className="text-neutral-300" style={{ color: "#cbd5f5" }}>
        Describe your app or choose a template. We'll generate an on-chain plan you can simulate, sign, and share.
      </p>
      <VibePrompt value={vibe} onChange={setVibe} onGenerate={handleGenerate} />
      <TemplatePicker recipe={recipe} onChange={setRecipe} />
      <BuildPlan plan={plan} />
      <LiveActionPreview plan={plan} />
    </div>
  );
};

export default VibeStudio;
