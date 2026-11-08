import { readFileSync, writeFileSync } from "node:fs";
import { initialData } from "../src/data.ts";

const literal = (value: unknown) => `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
const str = (value: string) => `'${value.replace(/'/g, "''")}'`;
// Only strip the migrations' outer transaction, preserving function bodies.
const migration = (name: string) => readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8")
  .split(/\r?\n/).filter(line => !/^(begin;|commit;)$/i.test(line.trim())).join("\n");
const settings = { ...initialData.settings, showDemoNotice: false };
const lines = [
  "-- BRAGA E BUZZO — instalação inicial completa, SEM imóveis demonstrativos.",
  "-- Execute uma única vez no SQL Editor de um projeto Supabase novo.",
  "-- Inclui segurança, Storage, configurações e conteúdo atual da advocacia.",
  "-- Fotos locais continuam nos arquivos do site; este SQL guarda seus caminhos.",
  "-- Não cria contas nem concede acesso administrativo automaticamente.",
  "begin;",
  `do $$ begin
    if to_regclass('public.settings') is not null or to_regclass('public.site_meta') is not null then
      raise exception 'O site já está inicializado neste banco. Operação cancelada para preservar os dados existentes.';
    end if;
  end $$;`,
  migration("001_site.sql"),
  migration("002_hardening.sql"),
  `insert into public.settings(id,data) values(1,${literal(settings)});`,
  `insert into public.site_content(id,data) values(1,${literal(initialData.content)});`,
];
for (const table of ["lawyers", "services"] as const) {
  initialData[table].forEach((item, index) => lines.push(
    `insert into public.${table}(id,data,sort_order) values(${str(item.id)},${literal(item)},${index});`,
  ));
}
lines.push("-- Imóveis e fotos de imóveis ficam vazios para cadastro pelo painel.",
  "update public.site_meta set version=1 where id=1;", "commit;", "");
writeFileSync(new URL("../supabase/setup-completo-sem-imoveis.sql", import.meta.url), lines.join("\n"));
console.log("Instalação gerada: supabase/setup-completo-sem-imoveis.sql");
