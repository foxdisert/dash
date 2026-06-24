/** Normalized shapes every provider implementation must speak. */

export type ClientType = "m3u" | "mag" | "protocol";

export interface ResellerInfo {
  username: string;
  enabled: boolean;
  credits: number;
}

export interface BouquetItem {
  id: string;
  name: string;
}

export interface DeviceInfo {
  username?: string;
  password?: string;
  mac?: string;
  expire?: string; // YYYY-MM-DD
  country?: string;
  userId?: string;
  note?: string;
  url?: string;
  enabled: boolean;
  status: "active" | "expired" | "disabled" | "unknown";
}

export interface CreateClientParams {
  type: ClientType;
  sub: number; // subscription duration code (months, 99 = demo)
  pack: string; // comma-separated bouquet ids or "all"
  mac?: string; // required for mag
  note?: string;
}

export interface CreateClientResult {
  userId?: string;
  username?: string;
  password?: string;
  mac?: string;
  url?: string;
  message: string;
}

export interface RenewClientParams {
  type: ClientType;
  sub: number;
  username?: string;
  password?: string;
  mac?: string;
}

export interface DeviceLookupParams {
  type: ClientType;
  username?: string;
  password?: string;
  mac?: string;
}

/** The contract a provider must implement to plug into the dashboard. */
export interface IptvProvider {
  readonly kind: string;
  getResellerInfo(): Promise<ResellerInfo>;
  getBouquets(): Promise<BouquetItem[]>;
  getDeviceInfo(params: DeviceLookupParams): Promise<DeviceInfo>;
  createClient(params: CreateClientParams): Promise<CreateClientResult>;
  renewClient(params: RenewClientParams): Promise<CreateClientResult>;
}

/** Config passed to a provider factory (decrypted key + base url). */
export interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
}

/** Static metadata about a provider kind, used to drive the "Add provider" UI. */
export interface ProviderKindMeta {
  kind: string;
  label: string;
  defaultBaseUrl: string;
  /** Allowed subscription duration codes for each client type. */
  subOptions: Record<ClientType, number[]>;
  supportedTypes: ClientType[];
}
