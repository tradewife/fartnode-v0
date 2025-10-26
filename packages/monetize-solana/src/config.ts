import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import type {
  Config,
  MonetizeConfig,
  NetworkKey,
  NormalizedRoute,
  RoutePrice,
  RouteSpec,
  RouteSpecInput
} from "./types.js";

const NETWORKS: readonly NetworkKey[] = ["solana-devnet", "solana"] as const;
const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"];

export const DEFAULT_CONFIG_FILENAME = "fartnode.x402.json";
export const DEFAULT_FACILITATOR_URL = "https://x402.org/facilitator";

const networkSchema = z.enum(["solana-devnet", "solana"]);

const routePriceSchema = z.union([
  z.string().min(1),
  z.number().positive(),
  z.object({
    amount: z.string().min(1),
    asset: z.object({
      address: z.string().min(1),
      decimals: z.number().int().nonnegative(),
      eip712: z
        .object({
          name: z.string().min(1),
          version: z.string().min(1)
        })
        .partial()
        .optional()
    })
  }).passthrough()
]);

const routeSpecInputSchema = z
  .object({
    price: routePriceSchema,
    network: networkSchema.optional(),
    config: z.record(z.string(), z.any()).optional()
  })
  .passthrough();

const routeKeySchema = z
  .string()
  .regex(/^\s*[A-Za-z]+\s+\/.+/, "Route keys must be in 'METHOD /path' format");

const partialMonetizeSchema = z
  .object({
    recipient: z.string().min(32).optional(),
    routes: z.record(routeKeySchema, routeSpecInputSchema).optional(),
    facilitatorUrl: z.string().url().optional(),
    useCdp: z.boolean().optional(),
    bazaarMetadata: z.boolean().optional()
  })
  .passthrough();

export interface LoadConfigOptions {
  cwd?: string;
  configPath?: string;
  inlineConfig?: Config;
  env?: Record<string, string | undefined>;
}

type PartialMonetize = {
  recipient?: string;
  routes?: Record<string, RouteSpecInput>;
  facilitatorUrl?: string;
  useCdp?: boolean;
  bazaarMetadata?: boolean;
};

export function loadMonetizeConfig({
  cwd = process.cwd(),
  configPath,
  inlineConfig,
  env = process.env
}: LoadConfigOptions = {}): MonetizeConfig | null {
  const targetPath = resolve(cwd, configPath ?? DEFAULT_CONFIG_FILENAME);
  const fileConfig = readConfigFile(targetPath);

  const inline = inlineConfig ? prepareInlineConfig(inlineConfig) : undefined;
  const merged = mergePartialConfigs(fileConfig, inline);

  const recipient = (env.SOL_RECIPIENT ?? merged.recipient)?.trim();
  const facilitatorUrl = resolvedFacilitatorUrl(env, merged);
  const useCdp = merged.useCdp ?? false;
  const bazaarMetadata = merged.bazaarMetadata ?? false;
  const sourceRoutes = (merged.routes as Record<string, RouteSpecInput> | undefined) ?? {};
  const defaultNetwork = parseNetwork(env.X402_NETWORK) ?? inferPreferredNetwork(sourceRoutes);
  if (!recipient || Object.keys(sourceRoutes).length === 0) {
    return null;
  }

  const normalized = normalizeRoutes(sourceRoutes, defaultNetwork);

  const config: MonetizeConfig = {
    recipient,
    routes: normalized.reduce<Record<string, RouteSpec>>((acc, entry) => {
      acc[entry.key] = entry.spec;
      return acc;
    }, {}),
    facilitatorUrl,
    useCdp,
    bazaarMetadata
  };

  return config;
}

export function normalizeRoutes(
  routes: Record<string, RouteSpecInput>,
  fallbackNetwork?: NetworkKey
): NormalizedRoute[] {
  return Object.entries(routes).map(([key, spec]) => {
    const keyInfo = normalizeRouteKey(key);
    const normalizedSpec = ensureRouteSpec(spec, fallbackNetwork);
    return {
      key: keyInfo.normalizedKey,
      method: keyInfo.method,
      path: keyInfo.path,
      spec: normalizedSpec
    };
  });
}

export function normalizeRouteKey(routeKey: string): {
  method: string;
  path: string;
  normalizedKey: string;
} {
  const trimmed = routeKey.trim().replace(/\s+/g, " ");
  const match = trimmed.match(/^([A-Za-z]+)\s+(.+)$/);
  if (!match) {
    throw new Error(`Invalid route key "${routeKey}". Expected format 'METHOD /path'.`);
  }

  const method = match[1].toUpperCase();
  if (!HTTP_METHODS.includes(method)) {
    throw new Error(`Unsupported HTTP method "${method}" in route key "${routeKey}".`);
  }

  let path = match[2].trim();
  if (!path.startsWith("/")) {
    path = `/${path.replace(/^\/+/, "")}`;
  }

  return {
    method,
    path,
    normalizedKey: `${method} ${path}`
  };
}

export function ensureRouteSpec(spec: RouteSpecInput, fallbackNetwork?: NetworkKey): RouteSpec {
  const parsed = routeSpecInputSchema.parse(spec);
  const network = parsed.network ?? fallbackNetwork ?? "solana-devnet";
  if (!NETWORKS.includes(network)) {
    throw new Error(`Unsupported network "${parsed.network}". Expected one of ${NETWORKS.join(", ")}.`);
  }

  return {
    price: parsed.price as RoutePrice,
    network,
    config: parsed.config ? { ...parsed.config } : undefined
  };
}

function readConfigFile(path: string): PartialMonetize {
  if (!existsSync(path)) {
    return {};
  }

  try {
    const json = JSON.parse(readFileSync(path, "utf-8"));
    return toPartial(partialMonetizeSchema.parse(json));
  } catch (error) {
    throw new Error(`Failed to read ${path}: ${(error as Error).message}`);
  }
}

function prepareInlineConfig(config: Config): PartialMonetize {
  const { configPath: _ignore, routes, ...rest } = config;
  const parsedBase = toPartial(partialMonetizeSchema.parse(rest));
  const parsedRoutes = routes
    ? Object.entries(routes).reduce<Record<string, RouteSpecInput>>((acc, [key, value]) => {
        acc[key] = routeSpecInputSchema.parse(value);
        return acc;
      }, {})
    : undefined;
  return {
    ...parsedBase,
    ...(parsedRoutes ? { routes: parsedRoutes } : {})
  } as PartialMonetize;
}

function mergePartialConfigs(base?: PartialMonetize, override?: PartialMonetize): PartialMonetize {
  if (!base && !override) {
    return {};
  }

  const merged: PartialMonetize = {
    ...(base ?? {}),
    ...(override ?? {})
  };

  const combinedRoutes = {
    ...(base?.routes ?? {}),
    ...(override?.routes ?? {})
  } as Record<string, RouteSpecInput>;

  merged.routes = Object.keys(combinedRoutes).length > 0 ? combinedRoutes : undefined;

  return merged;
}

function toPartial(source: z.infer<typeof partialMonetizeSchema>): PartialMonetize {
  return {
    recipient: source.recipient,
    facilitatorUrl: source.facilitatorUrl,
    useCdp: source.useCdp,
    bazaarMetadata: source.bazaarMetadata,
    routes: source.routes as Record<string, RouteSpecInput> | undefined
  };
}

function resolvedFacilitatorUrl(env: Record<string, string | undefined>, merged: PartialMonetize): string | undefined {
  const envUrl = env.X402_FACILITATOR_URL?.trim();
  if (envUrl) {
    return envUrl;
  }

  if (merged.useCdp) {
    return merged.facilitatorUrl;
  }

  return merged.facilitatorUrl ?? DEFAULT_FACILITATOR_URL;
}

function parseNetwork(value?: string): NetworkKey | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase() as NetworkKey;
  return NETWORKS.includes(normalized) ? normalized : undefined;
}

function inferPreferredNetwork(routes: Record<string, RouteSpecInput>): NetworkKey | undefined {
  for (const route of Object.values(routes)) {
    if (route.network && NETWORKS.includes(route.network)) {
      return route.network;
    }
  }
  return undefined;
}
