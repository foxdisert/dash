import "server-only";
import type {
  BouquetItem,
  CreateClientParams,
  CreateClientResult,
  DeviceInfo,
  DeviceLookupParams,
  IptvProvider,
  ProviderConfig,
  ProviderKindMeta,
  RenewClientParams,
  ResellerInfo,
} from "./types";

export const TVPLUSPANEL_META: ProviderKindMeta = {
  kind: "tvpluspanel",
  label: "TVPlus Panel (Dino)",
  defaultBaseUrl: "https://tvpluspanel.ru",
  supportedTypes: ["m3u", "mag", "protocol"],
  subOptions: {
    m3u: [1, 3, 6, 12, 99],
    mag: [1, 3, 6, 12, 99],
    protocol: [1, 3, 6, 12],
  },
};

/** "true" / "1" / true -> true. */
function truthy(v: unknown): boolean {
  return v === true || v === "true" || v === "1" || v === 1;
}

export class TvPlusPanelProvider implements IptvProvider {
  readonly kind = "tvpluspanel";
  private baseUrl: string;
  private apiKey: string;

  constructor(config: ProviderConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
  }

  private async call(params: Record<string, string | number | undefined>) {
    const url = new URL(`${this.baseUrl}/api/api.php`);
    url.searchParams.set("api_key", this.apiKey);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      throw new Error(`Provider HTTP ${res.status}`);
    }

    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        `Provider returned non-JSON response: ${text.slice(0, 120)}`,
      );
    }

    // The panel signals failures with status:"false" + a message.
    if (
      data &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      "status" in data &&
      !truthy((data as Record<string, unknown>).status)
    ) {
      const msg =
        (data as Record<string, unknown>).message ??
        (data as Record<string, unknown>).error ??
        "Provider request failed";
      throw new Error(String(msg));
    }

    return data;
  }

  async getResellerInfo(): Promise<ResellerInfo> {
    const d = (await this.call({ action: "reseller_info" })) as Record<
      string,
      unknown
    >;
    return {
      username: String(d.username ?? ""),
      enabled: truthy(d.enabled),
      credits: Number(d.credits ?? 0),
    };
  }

  async getBouquets(): Promise<BouquetItem[]> {
    const d = await this.call({ action: "bouquet" });
    if (!Array.isArray(d)) return [];
    return d.map((b: Record<string, unknown>) => ({
      id: String(b.id),
      name: String(b.name),
    }));
  }

  async getDeviceInfo(params: DeviceLookupParams): Promise<DeviceInfo> {
    const d = (await this.call({
      action: "device_info",
      username: params.username,
      password: params.password,
      mac: params.mac,
    })) as Record<string, unknown>;

    const enabled = truthy(d.enabled);
    const expire = d.expire ? String(d.expire) : undefined;
    let status: DeviceInfo["status"] = "unknown";
    if (!enabled) status = "disabled";
    else if (expire) {
      status = new Date(expire) >= new Date() ? "active" : "expired";
    } else status = "active";

    return {
      username: d.username ? String(d.username) : undefined,
      password: d.password ? String(d.password) : undefined,
      mac: d.mac ? String(d.mac) : params.mac,
      expire,
      country: d.country ? String(d.country) : undefined,
      userId: d.user_id ? String(d.user_id) : undefined,
      note: d.note ? String(d.note) : undefined,
      url: d.url ? String(d.url) : undefined,
      enabled,
      status,
    };
  }

  async createClient(params: CreateClientParams): Promise<CreateClientResult> {
    const d = (await this.call({
      action: "new",
      type: params.type,
      sub: params.sub,
      pack: params.pack,
      mac: params.mac,
      note: params.note,
    })) as Record<string, unknown>;

    return {
      userId: d.user_id ? String(d.user_id) : undefined,
      username: d.username ? String(d.username) : undefined,
      password: d.password ? String(d.password) : undefined,
      mac: d.mac ? String(d.mac) : params.mac,
      url: d.url ? String(d.url) : undefined,
      message: String(d.message ?? "Created"),
    };
  }

  async renewClient(params: RenewClientParams): Promise<CreateClientResult> {
    const d = (await this.call({
      action: "renew",
      type: params.type,
      sub: params.sub,
      username: params.username,
      password: params.password,
      mac: params.mac,
    })) as Record<string, unknown>;

    return {
      username: params.username,
      mac: params.mac,
      message: String(d.message ?? "Renewed"),
    };
  }
}
