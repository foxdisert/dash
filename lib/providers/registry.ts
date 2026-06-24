import "server-only";
import type { IptvProvider, ProviderConfig, ProviderKindMeta } from "./types";
import { TVPLUSPANEL_META, TvPlusPanelProvider } from "./tvpluspanel";
import { STRONG8K_META, Strong8kProvider } from "./strong8k";

type Factory = (config: ProviderConfig) => IptvProvider;

interface RegistryEntry {
  meta: ProviderKindMeta;
  factory: Factory;
}

/**
 * The provider registry. To add another provider:
 *   1. Implement IptvProvider in lib/providers/<kind>.ts (export META + class)
 *   2. Add one entry here.
 * The "Add provider" UI is generated from these metas automatically.
 */
const REGISTRY: Record<string, RegistryEntry> = {
  [TVPLUSPANEL_META.kind]: {
    meta: TVPLUSPANEL_META,
    factory: (config) => new TvPlusPanelProvider(config),
  },
  [STRONG8K_META.kind]: {
    meta: STRONG8K_META,
    factory: (config) => new Strong8kProvider(config),
  },
};

export function listProviderKinds(): ProviderKindMeta[] {
  return Object.values(REGISTRY).map((e) => e.meta);
}

export function getProviderKindMeta(kind: string): ProviderKindMeta | undefined {
  return REGISTRY[kind]?.meta;
}

export function createProviderClient(
  kind: string,
  config: ProviderConfig,
): IptvProvider {
  const entry = REGISTRY[kind];
  if (!entry) throw new Error(`Unknown provider kind: ${kind}`);
  return entry.factory(config);
}
