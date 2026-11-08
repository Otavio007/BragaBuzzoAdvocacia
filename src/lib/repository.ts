import { createClient } from "@supabase/supabase-js";
import { initialData } from "../data";
import type { SiteData } from "../types";
import { assertPublicKey } from "./security";
import { validateSiteData } from "./validation";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const demoMode = !url && !key;
let setupError = "";
function connect() {
  if (demoMode) return null;
  try {
    if (!url || !key)
      throw new Error("Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
    assertPublicKey(key);
    if (new URL(url).protocol !== "https:")
      throw new Error("Use uma URL HTTPS para o Supabase.");
    return createClient(url, key);
  } catch (e) {
    setupError = `Configuração Supabase inválida. ${(e as Error).message}`;
    return null;
  }
}
export const supabase = connect();
export async function readSite(): Promise<{ data: SiteData; version: number }> {
  if (setupError) throw new Error(setupError);
  if (!supabase) return { data: structuredClone(initialData), version: 0 };
  const { data, error } = await supabase.rpc("get_site_data");
  if (error)
    throw new Error(`Não foi possível carregar o site. ${error.message}`);
  if (!data?.site?.settings)
    throw new Error(
      "O banco ainda não foi preparado. Execute a migração e a carga inicial descritas no README.",
    );
  validateSiteData(data.site);
  if (!Number.isSafeInteger(data.version) || data.version < 0)
    throw new Error("Versão dos dados inválida.");
  return { data: data.site, version: data.version };
}
export async function writeSite(
  data: SiteData,
  version: number,
): Promise<number> {
  validateSiteData(data, { allowBlob: demoMode, contrast: true });
  if (!supabase) {
    if (!demoMode) throw new Error(setupError);
    return version + 1;
  }
  const result = await supabase.rpc("save_site_data", {
    payload: data,
    expected_version: version,
  });
  if (result.error)
    throw new Error(
      result.error.message.includes("VERSION_CONFLICT")
        ? "Outro administrador alterou o site. Suas alterações foram mantidas no formulário. Copie-as antes de recarregar os dados."
        : `Não foi possível salvar: ${result.error.message}`,
    );
  return result.data as number;
}
export async function uploadImage(file: File): Promise<string> {
  if (!supabase && !demoMode) throw new Error(setupError);
  if (
    !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)
  )
    throw new Error("Use imagens JPG, PNG, WebP ou AVIF.");
  if (file.size > 8 * 1024 * 1024)
    throw new Error("A imagem deve ter no máximo 8 MB.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("O arquivo não contém uma imagem válida.");
  }
  const oversized =
    bitmap.width > 10000 ||
    bitmap.height > 10000 ||
    bitmap.width * bitmap.height > 40000000;
  bitmap.close();
  if (oversized)
    throw new Error(
      "A imagem é muito grande. Use até 10.000 pixels por lado e 40 megapixels.",
    );
  if (!supabase) return URL.createObjectURL(file);
  const ext = (
    {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/avif": "avif",
    } as Record<string, string>
  )[file.type];
  const path = `images/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("site-images")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Falha no envio da imagem: ${error.message}`);
  return supabase.storage.from("site-images").getPublicUrl(path).data.publicUrl;
}
