import { Hono } from "hono";
import { withFartnodeX402 } from "@fartnode/monetize-solana";

type Env = {
  SOL_RECIPIENT: string;
  X402_FACILITATOR_URL?: string;
};

const app = new Hono<{ Bindings: Env }>();

withFartnodeX402(app, {
  recipient: (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env?.SOL_RECIPIENT,
  facilitatorUrl:
    (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
      ?.X402_FACILITATOR_URL,
  routes: {
    "POST /api/vibe/build": {
      price: "$0.10",
      network: "solana-devnet",
      config: {
        description: "Build a vibe app"
      }
    },
    "POST /api/mint/drop": {
      price: "$0.05",
      network: "solana-devnet",
      config: {
        description: "Mint a drop"
      }
    },
    "GET /api/lore/:id": {
      price: "$0.001",
      network: "solana-devnet",
      config: {
        description: "Fetch lore metadata"
      }
    }
  }
});

app.post("/api/vibe/build", c => c.json({ ok: true, route: "vibe_build" }));
app.post("/api/mint/drop", c => c.json({ ok: true, route: "mint_drop" }));
app.get("/api/lore/:id", c =>
  c.json({ id: c.req.param("id"), lore: "FARTNODE lore lives here" })
);

export default app;
