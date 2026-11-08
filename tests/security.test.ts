import test from "node:test";
import assert from "node:assert/strict";
import { initialData } from "../src/data.ts";
import {
  isSafeUrl,
  assertPublicKey,
  contrastWithWhite,
} from "../src/lib/security.ts";
import { validateSiteData } from "../src/lib/validation.ts";
import { readFileSync } from "node:fs";
test("valida protocolos, credenciais e tentativas de contornar URLs", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,test",
    "//evil.test/a.png",
    "https://user:password@evil.test/",
    "https:\\evil.test",
    "https://example.com/\nfile",
  ])
    assert.equal(isSafeUrl(url, true), false, url);
  assert.equal(isSafeUrl("https://example.com/image.png"), true);
  assert.equal(isSafeUrl("/logo-transparent.png", true), true);
  assert.equal(isSafeUrl("blob:preview", false, true), true);
  assert.equal(isSafeUrl("blob:preview"), false);
});
test("chaves privilegiadas são rejeitadas antes de chegarem ao bundle", () => {
  assert.throws(() => assertPublicKey("sb_secret_example"));
  assert.throws(() => assertPublicKey(" sb_secret_example "));
  const jwt = (role: string) =>
    `e30.${btoa(JSON.stringify({ role }))}.signature`;
  assert.throws(() => assertPublicKey(jwt("service_role")));
  assert.doesNotThrow(() => assertPublicKey(jwt("anon")));
  assert.doesNotThrow(() => assertPublicKey("sb_publishable_example"));
});
test("dados completos, campos opcionais e contraste são validados", () => {
  assert.doesNotThrow(() =>
    validateSiteData(structuredClone(initialData), { contrast: true }),
  );
  assert.ok(contrastWithWhite("#244f56") >= 4.5);
  const bad = structuredClone(initialData);
  bad.settings.primary = "#eeeeee";
  assert.throws(() => validateSiteData(bad, { contrast: true }), /clara/);
  assert.throws(() => validateSiteData({ settings: initialData.settings }));
  const extra = structuredClone(initialData);
  Object.assign(extra.settings, {
    privateNotes: "Não pode entrar nas configurações públicas",
  });
  assert.throws(() => validateSiteData(extra), /desconhecido/);
  const images = structuredClone(initialData);
  images.properties[0].images = ["data:image/svg+xml,test"];
  assert.throws(() => validateSiteData(images));
});
test("hospedagem define política de conteúdo, anti-enquadramento e restrições de recursos", () => {
  const config = JSON.parse(
    readFileSync(new URL("../vercel.json", import.meta.url), "utf8"),
  );
  const headers = Object.fromEntries(
    config.headers[0].headers.map((h: { key: string; value: string }) => [
      h.key,
      h.value,
    ]),
  );
  assert.equal(headers["X-Frame-Options"], "DENY");
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.match(headers["Content-Security-Policy"], /script-src 'self';/);
  assert.match(headers["Content-Security-Policy"], /object-src 'none'/);
});
