import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { initialData } from "../src/data.ts";

test("instalação completa preserva advocacia, inicia sem imóveis e protege a reinstalação", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated;
      create schema auth; create table auth.users(id uuid primary key,email text);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create schema storage;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text);
      alter table storage.objects enable row level security;
      grant usage on schema public,auth,storage to anon,authenticated;
      grant select,insert,update,delete on storage.objects to anon,authenticated;`);
    const sql = readFileSync(new URL("../supabase/setup-completo-sem-imoveis.sql", import.meta.url), "utf8");
    await db.exec(sql);
    await db.exec("set role anon");
    const result = (await db.query<{data: {version: number; site: typeof initialData}}>("select public.get_site_data() as data")).rows[0].data;
    assert.equal(result.version, 1);
    assert.deepEqual(result.site.content, initialData.content);
    assert.deepEqual(result.site.lawyers, initialData.lawyers);
    assert.deepEqual(result.site.services, initialData.services);
    assert.deepEqual(result.site.settings, {...initialData.settings, showDemoNotice: false});
    assert.deepEqual(result.site.properties, []);
    assert.equal((await db.query("select * from public.property_photos")).rows.length, 0);
    await assert.rejects(db.query("select public.save_site_data($1::jsonb,1)", [JSON.stringify(result.site)]));
    await db.exec("reset role");
    await assert.rejects(db.exec(sql), /já está inicializado/);
    await db.exec("rollback");
    assert.equal((await db.query("select * from public.lawyers")).rows.length, initialData.lawyers.length);
    const adminSql = readFileSync(new URL("../supabase/configurar-admin.sql", import.meta.url), "utf8");
    await assert.rejects(db.exec(adminSql), /Conta não encontrada/);
    await db.exec("insert into auth.users values('11111111-1111-4111-8111-111111111111','teste@example.com')");
    await db.exec(adminSql.replace("SEU-EMAIL-AQUI", "teste@example.com"));
    await db.exec(adminSql.replace("SEU-EMAIL-AQUI", "teste@example.com"));
    assert.equal((await db.query("select * from public.administrators")).rows.length, 1);
  } finally { await db.close(); }
});
