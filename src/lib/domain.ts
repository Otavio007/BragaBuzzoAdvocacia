import type { Area, Filters, Property, Settings } from "../types";
export const money = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  });
export const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export function whatsappUrl(
  settings: Settings,
  area: Area,
  context: { service?: string; title?: string; link?: string } = {},
) {
  const phone = settings.whatsapp.replace(/\D/g, "");
  if (!/^[1-9]\d{9,14}$/.test(phone)) return null;
  const template = context.title
    ? settings.whatsappProperty
    : context.service
      ? settings.whatsappService
      : settings.whatsappGeneral;
  let body = template.replace(
    /\{(area|servico|titulo|link)\}/g,
    (_, key: string) =>
      ({
        area,
        servico: context.service ?? "",
        titulo: context.title ?? "",
        link: context.link ?? "",
      })[key]!,
  );
  if (context.title && !body.includes(context.title))
    body += `\nImóvel: ${context.title}`;
  if (context.service && !body.includes(context.service))
    body += `\nServiço: ${context.service}`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(`[${area}] ${body}`)}`;
}
export function filterProperties(items: Property[], filters: Filters) {
  return items.filter(
    (p) =>
      p.status === "publicado" &&
      (!filters.city || p.city === filters.city) &&
      (!filters.neighborhood || p.neighborhood === filters.neighborhood) &&
      (!filters.type || p.type === filters.type) &&
      (!filters.maxRent || p.rent <= Number(filters.maxRent)) &&
      (!filters.bedrooms || p.bedrooms >= Number(filters.bedrooms)),
  );
}
export function validateProperty(p: Property) {
  if (!p.title.trim() || !p.slug.trim())
    throw new Error("Preencha o título e o link do imóvel.");
  if (
    p.status === "publicado" &&
    (!p.city.trim() || !p.neighborhood.trim() || !p.description.trim())
  )
    throw new Error("Para publicar, preencha descrição, cidade e bairro.");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug))
    throw new Error("O link deve usar letras minúsculas, números e hífens.");
  if (!Number.isFinite(p.rent) || p.rent < 0 || p.area < 0)
    throw new Error("Aluguel e área não podem ser negativos.");
  if (p.status === "publicado" && (p.rent === 0 || p.area === 0))
    throw new Error("Para publicar, informe aluguel e área maiores que zero.");
  if (
    [p.area, p.bedrooms, p.bathrooms, p.parking, p.condo ?? 0, p.tax ?? 0].some(
      (n) => !Number.isFinite(n) || n < 0,
    )
  )
    throw new Error("Valores e características não podem ser negativos.");
  if (![p.bedrooms, p.bathrooms, p.parking].every(Number.isInteger))
    throw new Error("Quartos, banheiros e vagas devem ser números inteiros.");
  if (p.status === "publicado" && !p.images.length)
    throw new Error("Adicione pelo menos uma foto para publicar.");
}
