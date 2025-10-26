import type { Hono } from "hono";
import {
  paymentMiddleware,
  type PaymentMiddlewareConfig,
  type RouteConfig,
  type RoutesConfig
} from "x402-hono";
import { ensureRouteSpec, loadMonetizeConfig, normalizeRouteKey } from "./config.js";
import type { Config, NetworkKey, RouteSpec, RouteSpecInput } from "./types.js";

type Facilitator = Parameters<typeof paymentMiddleware>[2];

interface RuntimeState {
  routesConfig: RoutesConfig;
  routeMap: Map<string, RouteSpec>;
  recipient: string;
  facilitator?: Facilitator;
  bazaarMetadata: boolean;
  defaultNetwork?: NetworkKey;
}

const states = new WeakMap<object, RuntimeState>();

export function withFartnodeX402(app: Hono, cfg?: Config): void {
  const config = loadMonetizeConfig({
    inlineConfig: cfg,
    configPath: cfg?.configPath
  });

  if (!config) {
    return;
  }

  const { routesConfig, routeMap } = buildRoutesConfig(config.routes, config.bazaarMetadata ?? false);
  const facilitator = config.useCdp ? undefined : deriveFacilitator(config.facilitatorUrl);
  const payTo = config.recipient as Parameters<typeof paymentMiddleware>[0];
  const middleware = paymentMiddleware(payTo, routesConfig, facilitator);

  app.use(middleware);

  states.set(app as unknown as object, {
    routesConfig,
    routeMap,
    recipient: config.recipient,
    facilitator,
    bazaarMetadata: config.bazaarMetadata ?? false,
    defaultNetwork: firstNetwork(routeMap)
  });
}

export function registerPaid(app: Hono, routeKey: string, spec: RouteSpecInput): void {
  const state = states.get(app as unknown as object);
  if (!state) {
    throw new Error("withFartnodeX402 must be called before registerPaid.");
  }

  const { normalizedKey } = normalizeRouteKey(routeKey);
  const normalizedSpec = ensureRouteSpec(spec, state.defaultNetwork);
  state.routesConfig[normalizedKey] = toRouteConfig(normalizedSpec, state.bazaarMetadata);
  state.routeMap.set(normalizedKey, normalizedSpec);
  if (!state.defaultNetwork) {
    state.defaultNetwork = normalizedSpec.network;
  }
}

function deriveFacilitator(url?: string): Facilitator | undefined {
  return url ? ({ url } as Facilitator) : undefined;
}

function buildRoutesConfig(routes: Record<string, RouteSpec>, bazaarMetadata: boolean): {
  routesConfig: RoutesConfig;
  routeMap: Map<string, RouteSpec>;
} {
  const routeMap = new Map<string, RouteSpec>();
  const routesConfig: RoutesConfig = {};

  for (const [key, spec] of Object.entries(routes)) {
    const normalized = ensureRouteSpec(spec, spec.network);
    routeMap.set(key, normalized);
    routesConfig[key] = toRouteConfig(normalized, bazaarMetadata);
  }

  return { routeMap, routesConfig };
}

function toRouteConfig(spec: RouteSpec, bazaarMetadata: boolean): RouteConfig {
  const config = spec.config
    ? { ...(spec.config as Partial<PaymentMiddlewareConfig>) }
    : undefined;

  if (bazaarMetadata) {
    const enriched = { ...(config ?? {}) };
    if (enriched.discoverable === undefined) {
      enriched.discoverable = true;
    }
    return {
      price: spec.price,
      network: spec.network,
      config: enriched
    };
  }

  return {
    price: spec.price,
    network: spec.network,
    config
  };
}

function firstNetwork(routeMap: Map<string, RouteSpec>): NetworkKey | undefined {
  for (const route of routeMap.values()) {
    return route.network;
  }

  return undefined;
}
