import test from "node:test";
import assert from "node:assert/strict";
import {
  filterProperties,
  money,
  slugify,
  validateProperty,
  whatsappUrl,
} from "../src/lib/domain.ts";
import { initialData } from "../src/data.ts";
const filters = {
  city: "",
  neighborhood: "",
  type: "",
  maxRent: "",
  bedrooms: "",
};
test("valores monetários preservam os centavos informados", () => {
  assert.match(money(3800.5), /3\.800,50/);
});
test("combina filtros e exclui imóveis privados independentemente dos filtros", () => {
  const property = initialData.properties[0];
  const result = filterProperties(
    [
      ...initialData.properties,
      { ...property, id: "privado", status: "rascunho" },
      { ...property, id: "alugado", status: "alugado" },
      { ...property, id: "arquivo", status: "arquivado" },
    ],
    {
      ...filters,
      city: "São Paulo",
      neighborhood: "Jardim Paulista",
      type: "Apartamento",
      maxRent: "4000",
      bedrooms: "2",
    },
  );
  assert.deepEqual(
    result.map((p) => p.id),
    [property.id],
  );
  assert.equal(
    filterProperties(initialData.properties, { ...filters, maxRent: "1" })
      .length,
    0,
  );
});
test("mensagem de imóvel contém área obrigatória, título e link com caracteres especiais", () => {
  const title = "Casa & jardim / São Paulo";
  const link = "https://example.com/imobiliaria/imoveis/casa";
  const url = whatsappUrl(
    { ...initialData.settings, whatsapp: "+55 (11) 99999-9999" },
    "Imobiliária",
    { title, link },
  )!;
  assert.equal(new URL(url).pathname, "/5511999999999");
  const message = new URL(url).searchParams.get("text")!;
  assert.ok(message.startsWith("[Imobiliária]"));
  assert.ok(message.includes(title));
  assert.ok(message.includes(link));
});
test("serviço sempre identifica advocacia mesmo em template personalizado", () => {
  const url = whatsappUrl(
    {
      ...initialData.settings,
      whatsapp: "5511999999999",
      whatsappService: "Quero {servico} & orientações",
    },
    "Advocacia",
    { service: "Família e sucessões" },
  )!;
  assert.equal(
    new URL(url).searchParams.get("text"),
    "[Advocacia] Quero Família e sucessões & orientações",
  );
  assert.equal(
    whatsappUrl({ ...initialData.settings, whatsapp: "" }, "Advocacia"),
    null,
  );
  assert.equal(
    whatsappUrl({ ...initialData.settings, whatsapp: "123" }, "Imobiliária"),
    null,
  );
  const custom = whatsappUrl(
    {
      ...initialData.settings,
      whatsapp: "5511999999999",
      whatsappProperty: "Olá",
    },
    "Imobiliária",
    { title: "Casa escolhida" },
  )!;
  assert.ok(
    new URL(custom).searchParams.get("text")?.includes("Casa escolhida"),
  );
});
test("valida valores, campos e foto obrigatória apenas para publicação", () => {
  const p = structuredClone(initialData.properties[0]);
  assert.doesNotThrow(() => validateProperty(p));
  assert.throws(() => validateProperty({ ...p, rent: -1 }));
  assert.throws(() => validateProperty({ ...p, tax: -1 }));
  assert.throws(() => validateProperty({ ...p, bedrooms: 1.5 }));
  assert.throws(() => validateProperty({ ...p, images: [] }));
  assert.doesNotThrow(() =>
    validateProperty({ ...p, status: "rascunho", images: [] }),
  );
  assert.throws(() => validateProperty({ ...p, slug: "Espaço inválido" }));
  assert.equal(
    slugify("Apartamento São José & Luz!"),
    "apartamento-sao-jose-luz",
  );
});
