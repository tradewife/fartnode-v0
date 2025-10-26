import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { createPaidMcpServer, type ToolSpec } from "@fartnode/monetize-solana";

const recipient = process.env.SOL_RECIPIENT;
if (!recipient) {
  throw new Error("SOL_RECIPIENT environment variable is required to run the MCP server.");
}

const tools: ToolSpec[] = [
  {
    name: "vibe_build",
    title: "Vibe Builder",
    description: "Returns a lightweight vibe JSON payload.",
    inputSchema: {
      prompt: z.string().describe("Prompt used to shape the vibe response")
    },
    outputSchema: {
      result: z.string()
    },
    monetize: {
      price: "$0.10",
      network: "solana-devnet",
      config: {
        description: "Generate a vibe summary JSON blob"
      }
    },
    handler: async ({ prompt }) => {
      const payload = {
        prompt,
        steps: [
          "ingest inspiration",
          "compose vibes",
          "emit drop"
        ]
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(payload, null, 2)
          }
        ],
        structuredContent: payload
      };
    }
  },
  {
    name: "ping",
    title: "Ping",
    description: "Free heartbeat tool.",
    inputSchema: {
      message: z.string().optional()
    },
    handler: async ({ message }) => {
      const response = { ok: true, message: message ?? "pong" };
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response)
          }
        ],
        structuredContent: response
      };
    }
  }
];

const server = createPaidMcpServer(tools, {
  recipient,
  facilitatorUrl: process.env.X402_FACILITATOR_URL,
  defaultNetwork: "solana-devnet",
  validatePayment: async payment => {
    if (!payment.startsWith("ey")) {
      throw new Error("Invalid X-PAYMENT header. Provide a base64 encoded payload.");
    }
  }
});

const app = express();
app.use(express.json());

app.post("/mcp", async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });

  res.on("close", () => {
    transport.close().catch(() => {
      /* noop */
    });
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`Paid MCP server listening on http://localhost:${port}/mcp`);
});
