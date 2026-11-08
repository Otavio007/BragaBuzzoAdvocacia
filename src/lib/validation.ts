import { initialData } from "../data";
import type { SiteData } from "../types";
import { validateProperty } from "./domain";
import { isSafeUrl, contrastWithWhite } from "./security";
const object = (v: unknown): v is Record<string, unknown> =>
  Boolean(v) && typeof v === "object" && !Array.isArray(v);
function shape(value: unknown, template: object, name: string) {
  if (!object(value)) throw new Error(`${name}: formato inválido.`);
  if (Object.keys(value).some((key) => !Object.hasOwn(template, key)))
    throw new Error(`${name}: campo desconhecido.`);
  for (const [key, example] of Object.entries(template)) {
    const item = value[key];
    if (
      example === null || key === "condo" || key === "tax"
        ? item !== null && typeof item !== "number"
        : Array.isArray(example)
          ? !Array.isArray(item)
          : typeof item !== typeof example
    )
      throw new Error(`${name}: campo ${key} inválido.`);
    if (typeof item === "string" && item.length > 50000)
      throw new Error(`${name}: texto muito longo.`);
    if (typeof item === "number" && !Number.isFinite(item))
      throw new Error(`${name}: valor numérico inválido.`);
  }
}
export function validateSiteData(
  value: unknown,
  { allowBlob = false, contrast = false } = {},
): asserts value is SiteData {
  if (!object(value)) throw new Error("Dados do site inválidos.");
  shape(value, initialData, "Site");
  if (new TextEncoder().encode(JSON.stringify(value)).length > 4000000)
    throw new Error(
      "O conteúdo excede o limite de 4 MB. Reduza os cadastros ou textos.",
    );
  shape(value.settings, initialData.settings, "Configurações");
  shape(value.content, initialData.content, "Conteúdo");
  for (const key of ["properties", "services", "lawyers"] as const)
    if (!Array.isArray(value[key]) || value[key].length > 1000)
      throw new Error(`Lista de ${key} inválida.`);
  const data = value as unknown as SiteData;
  const s = data.settings;
  if (!s.brand.trim()) throw new Error("Preencha o nome da marca.");
  if (!/^#[\da-f]{6}$/i.test(s.primary) || !/^#[\da-f]{6}$/i.test(s.accent))
    throw new Error("Informe cores válidas no formato #RRGGBB.");
  if (contrast && contrastWithWhite(s.primary) < 4.5)
    throw new Error(
      "A cor principal está muito clara para os botões. Escolha um tom mais escuro para manter a leitura.",
    );
  if (s.whatsapp && !/^[1-9]\d{9,14}$/.test(s.whatsapp.replace(/\D/g, "")))
    throw new Error("WhatsApp inválido. Inclua país, DDD e número.");
  for (const key of ["instagram", "facebook"] as const)
    if (!isSafeUrl(s[key]))
      throw new Error(
        "Use links HTTPS válidos e sem credenciais nas redes sociais.",
      );
  for (const [key, v] of Object.entries(s))
    if (
      ["logo", "lawImage", "estateImage"].includes(key) &&
      !isSafeUrl(v as string, true, allowBlob)
    )
      throw new Error(
        "Endereço de imagem inválido. Use HTTPS ou um arquivo local.",
      );
  for (const [key, v] of Object.entries(data.content))
    if (key.endsWith("Image") && !isSafeUrl(v as string, true, allowBlob))
      throw new Error("Endereço de imagem inválido.");
  const sections = data.content.sections;
  if (
    sections.length !== 5 ||
    sections.some(
      (x) =>
        !object(x) ||
        !["inicio", "sobre", "equipe", "servicos", "contato"].includes(x.id) ||
        typeof x.visible !== "boolean" ||
        typeof x.label !== "string",
    ) ||
    new Set(sections.map((x) => x.id)).size !== 5
  )
    throw new Error("As seções da advocacia são inválidas.");
  for (const [key, template] of [
    ["lawyers", initialData.lawyers[0]],
    ["services", initialData.services[0]],
    ["properties", initialData.properties[0]],
  ] as const) {
    const items = data[key];
    for (const item of items) {
      shape(item, template, "Cadastro");
      if (!item.id.trim()) throw new Error("Identificador obrigatório.");
    }
    if (new Set(items.map((x) => x.id)).size !== items.length)
      throw new Error("Há cadastros com identificadores duplicados.");
  }
  if (
    data.lawyers.some(
      (l) => !l.name.trim() || !isSafeUrl(l.image, true, allowBlob),
    )
  )
    throw new Error("Verifique os nomes e fotos da equipe.");
  if (data.services.some((s) => !s.title.trim()))
    throw new Error("Preencha os títulos dos serviços.");
  if (
    new Set(data.properties.map((p) => p.slug)).size !== data.properties.length
  )
    throw new Error("Cada imóvel precisa ter um link exclusivo.");
  for (const p of data.properties) {
    if (
      !["rascunho", "publicado", "alugado", "arquivado"].includes(p.status) ||
      p.images.length > 30 ||
      p.images.some(
        (v) => typeof v !== "string" || !v || !isSafeUrl(v, false, allowBlob),
      ) ||
      p.features.some((v) => typeof v !== "string")
    )
      throw new Error("Status, fotos ou características do imóvel inválidos.");
    validateProperty(p);
  }
}
