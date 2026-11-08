export function isSafeUrl(value: string, local = false, blob = false): boolean {
  if (!value) return true;
  if (/[\s\\\u0000-\u001f\u007f]/.test(value)) return false;
  if (local && value.startsWith("/") && !value.startsWith("//")) return true;
  if (blob && value.startsWith("blob:")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}
export function assertPublicKey(key: string) {
  if (key !== key.trim())
    throw new Error("Remova os espaços ao redor da chave Supabase.");
  if (key.startsWith("sb_secret_"))
    throw new Error(
      "Chaves secretas do Supabase não podem ser usadas no frontend. Use a chave pública.",
    );
  const parts = key.split(".");
  if (parts.length === 3) {
    let payload: { role?: string };
    try {
      payload = JSON.parse(
        atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
    } catch {
      throw new Error("A chave Supabase informada não é um JWT válido.");
    }
    if (payload.role !== "anon")
      throw new Error(
        "O frontend aceita somente a chave pública anon, nunca service_role.",
      );
  }
}
export function contrastWithWhite(hex: string): number {
  const rgb = hex
    .slice(1)
    .match(/../g)!
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 1.05 / (rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 + 0.05);
}
