/** Client-safe {{var}} substitution (mirrors server renderTemplate). */
export function applyVars(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*([\w]+)\s*\}\}/g, (_, k: string) =>
    vars[k] != null ? vars[k] : "",
  );
}

/** Replaces the host[:port] of a URL (m3u link or xtream server) with newHost. */
export function swapHost(value: string, newHost: string): string {
  if (!value || !newHost) return value;
  const host = newHost.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  try {
    const u = new URL(value);
    u.host = host;
    return u.toString();
  } catch {
    return /^https?:\/\//.test(value)
      ? value.replace(/^(https?:\/\/)[^/]+/, `$1${host}`)
      : `http://${host}`;
  }
}

/** Builds a wa.me link with pre-filled text. Returns null if no digits. */
export function waLink(phone: string, text: string): string | null {
  const digits = phone.replace(/[^\d]/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
