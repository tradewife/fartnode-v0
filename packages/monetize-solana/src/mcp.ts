import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError } from "@modelcontextprotocol/sdk/types.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerNotification, ServerRequest } from "@modelcontextprotocol/sdk/types.js";
import type { z, ZodRawShape } from "zod";
import { DEFAULT_FACILITATOR_URL, ensureRouteSpec } from "./config.js";
import type { PaidToolContext, RouteSpec, ToolSpec, X402Config } from "./types.js";

type ToolArgs<Args extends ZodRawShape> = z.objectOutputType<Args, z.ZodTypeAny>;

const DEFAULT_SERVER_INFO = {
  name: "fartnode-paid-tools",
  version: "0.1.0"
} as const;

export function createPaidMcpServer(tools: ToolSpec[], x402: X402Config): McpServer {
  if (!x402.recipient) {
    throw new Error("X402 config requires a Solana recipient address.");
  }

  const server = new McpServer(x402.server ?? DEFAULT_SERVER_INFO);
  const facilitatorUrl = resolveFacilitatorUrl(x402);

  for (const tool of tools) {
    const inputSchema = tool.inputSchema ?? {};
    const monetizedSpec = resolveToolRouteSpec(tool, x402);
    const routeKey = monetizedSpec ? `TOOL ${tool.name}` : undefined;

  const handler = createHandler(tool, monetizedSpec, {
    facilitatorUrl,
    validator: x402.validatePayment,
    routeKey,
    recipient: x402.recipient
  });

    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema,
        outputSchema: tool.outputSchema,
        annotations: tool.annotations
      },
      handler as any
    );
  }

  return server;
}

function createHandler<Args extends ZodRawShape>(
  tool: ToolSpec<Args>,
  monetizedSpec: RouteSpec | undefined,
  options: {
    facilitatorUrl?: string;
    validator?: X402Config["validatePayment"];
    routeKey?: string;
    recipient: string;
  }
) {
  return async (
    args: ToolArgs<Args>,
    extra: RequestHandlerExtra<ServerRequest, ServerNotification>
  ) => {
    if (monetizedSpec) {
      const payment = extractPayment(extra);
      if (!payment) {
        throw paymentRequiredError(tool.name, monetizedSpec, options);
      }

      if (options.validator) {
        await options.validator(payment, {
          toolName: tool.name,
          routeKey: options.routeKey ?? `TOOL ${tool.name}`,
          spec: monetizedSpec
        });
      }
    }

    return tool.handler(args, extra);
  };
}

function resolveToolRouteSpec(tool: ToolSpec, x402: X402Config): RouteSpec | undefined {
  const key = `TOOL ${tool.name}`;
  const routeInput = tool.monetize ?? x402.routes?.[key];
  if (!routeInput) {
    return undefined;
  }
  return ensureRouteSpec(routeInput, x402.defaultNetwork);
}

function extractPayment(extra: RequestHandlerExtra<ServerRequest, ServerNotification>): string | undefined {
  const metaPayment = typeof extra._meta === "object" && extra._meta !== null
    ? (extra._meta as Record<string, unknown>).x402Payment
    : undefined;
  if (typeof metaPayment === "string" && metaPayment.trim().length > 0) {
    return metaPayment.trim();
  }

  const headers = extra.requestInfo?.headers;
  if (!headers) {
    return undefined;
  }

  const entry = findHeader(headers, "x-payment");
  if (typeof entry === "string") {
    return entry.trim();
  }
  if (Array.isArray(entry)) {
    return entry.find(value => value && value.trim().length > 0)?.trim();
  }
  return undefined;
}

function findHeader(
  headers: Record<string, string | string[] | undefined>,
  header: string
): string | string[] | undefined {
  const target = header.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) {
      return value;
    }
  }
  return undefined;
}

function paymentRequiredError(
  toolName: string,
  spec: RouteSpec,
  options: {
    facilitatorUrl?: string;
    recipient: string;
  }
): McpError {
  return new McpError(402, `x402 payment required for tool "${toolName}".`, {
    requirement: {
      price: spec.price,
      network: spec.network,
      recipient: options.recipient,
      facilitatorUrl: options.facilitatorUrl
    }
  });
}

function resolveFacilitatorUrl(x402: X402Config): string | undefined {
  if (x402.useCdp) {
    return x402.facilitatorUrl;
  }
  return x402.facilitatorUrl ?? DEFAULT_FACILITATOR_URL;
}
