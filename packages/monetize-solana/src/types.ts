import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";

export type NetworkKey = "solana-devnet" | "solana";

export type RoutePrice =
  | string
  | number
  | {
      amount: string;
      asset: {
        address: string;
        decimals: number;
        eip712?: {
          name?: string;
          version?: string;
        };
      };
    };

export interface RouteSpecInput {
  price: RoutePrice;
  network?: NetworkKey;
  config?: Record<string, unknown>;
}

export interface RouteSpec extends RouteSpecInput {
  network: NetworkKey;
}

export interface MonetizeConfig {
  recipient: string;
  routes: Record<string, RouteSpec>;
  facilitatorUrl?: string;
  useCdp?: boolean;
  bazaarMetadata?: boolean;
}

export interface Config extends Partial<Omit<MonetizeConfig, "routes">> {
  routes?: Record<string, RouteSpecInput>;
  configPath?: string;
}

export interface ToolSpec<Args extends ZodRawShape = ZodRawShape> {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: Args;
  outputSchema?: ZodRawShape;
  annotations?: ToolAnnotations;
  monetize?: RouteSpecInput;
  handler: ToolCallback<Args>;
}

export interface PaidToolContext {
  toolName: string;
  routeKey: string;
  spec: RouteSpec;
}

export interface X402Config extends Config {
  server?: {
    name: string;
    version: string;
    description?: string;
  };
  defaultNetwork?: NetworkKey;
  validatePayment?: (payment: string, context: PaidToolContext) => Promise<void> | void;
}

export interface NormalizedRoute {
  key: string;
  method: string;
  path: string;
  spec: RouteSpec;
}
