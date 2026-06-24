/** Client-safe {{var}} substitution (mirrors server renderTemplate). */
export function applyVars(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*([\w]+)\s*\}\}/g, (_, k: string) =>
    vars[k] != null ? vars[k] : "",
  );
}

/** Builds a wa.me link with pre-filled text. Returns null if no digits. */
export function waLink(phone: string, text: string): string | null {
  const digits = phone.replace(/[^\d]/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
