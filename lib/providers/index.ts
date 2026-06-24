import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { providers, type Provider } from "@/lib/db/schema";
import { decrypt } from "@/lib/crypto";
import { createProviderClient } from "./registry";
import type { IptvProvider } from "./types";

/** Builds a live provider client from a stored provider row (decrypts key). */
export function clientFor(provider: Provider): IptvProvider {
  return createProviderClient(provider.kind, {
    baseUrl: provider.baseUrl,
    apiKey: decrypt(provider.apiKeyEncrypted),
  });
}

/** Loads a provider row by id and returns a live client. */
export function clientForId(id: number): {
  provider: Provider;
  client: IptvProvider;
} {
  const provider = db.select().from(providers).where(eq(providers.id, id)).get();
  if (!provider) throw new Error(`Provider ${id} not found`);
  return { provider, client: clientFor(provider) };
}

export * from "./types";
export {
  listProviderKinds,
  getProviderKindMeta,
  createProviderClient,
} from "./registry";
