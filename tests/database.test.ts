import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { initialData } from "../src/data.ts";

test("migração PostgreSQL: RLS, transações, estados e conflitos de versão", async (t) => {
  const db = new PGlite();
  const admin = "11111111-1111-4111-8111-111111111111";
  const other = "22222222-2222-4222-8222-222222222222";
  try {
    // Apenas os contratos fornecidos pela plataforma são simulados. Toda a migração real é executada.
    await db.exec(`create role anon; create role authenticated;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create schema storage;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text);
      alter table storage.objects enable row level security;
      grant usage on schema public,auth,storage to anon,authenticated;
      grant select,insert,update,delete on storage.objects to anon,authenticated;
      insert into auth.users values('${admin}'),('${other}');`);
    await db.exec(
      readFileSync(
        new URL("../supabase/migrations/001_site.sql", import.meta.url),
        "utf8",
      ),
    );
    await db.exec(
      readFileSync(
        new URL("../supabase/migrations/002_hardening.sql", import.meta.url),
        "utf8",
      ),
    );
    await db.exec(
      readFileSync(new URL("../supabase/seed.sql", import.meta.url), "utf8"),
    );
    await db.query("insert into public.administrators(user_id) values($1)", [
      admin,
    ]);
    async function role(name: "anon" | "authenticated", uid = "") {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        uid,
      ]);
      await db.exec(`set role ${name}`);
    }
    async function read() {
      return (
        await db.query<{ data: { version: number; site: typeof initialData } }>(
          "select public.get_site_data() as data",
        )
      ).rows[0].data;
    }
    await t.test(
      "visitante lê catálogo e não pode gravar ou enviar arquivos",
      async () => {
        await role("anon");
        assert.equal((await read()).site.properties.length, 4);
        await assert.rejects(
          db.query("select public.save_site_data($1::jsonb,1)", [
            JSON.stringify(initialData),
          ]),
        );
        await assert.rejects(
          db.query("insert into public.settings values(2,'{}')"),
        );
        await assert.rejects(
          db.query(
            "insert into storage.objects(bucket_id) values('site-images')",
          ),
        );
      },
    );
    await t.test(
      "usuário autenticado comum não obtém direitos administrativos",
      async () => {
        await role("authenticated", other);
        assert.equal(
          (await db.query<{ ok: boolean }>("select public.is_admin() as ok"))
            .rows[0].ok,
          false,
        );
        await assert.rejects(
          db.query("select public.save_site_data($1::jsonb,1)", [
            JSON.stringify(initialData),
          ]),
        );
        await assert.rejects(
          db.query("insert into public.administrators(user_id) values($1)", [
            other,
          ]),
        );
      },
    );
    await t.test(
      "administrador salva atomicamente e imóveis privados somem da leitura pública",
      async () => {
        await role("authenticated", admin);
        const changed = structuredClone(initialData);
        changed.properties[0].status = "rascunho";
        changed.properties[1].status = "alugado";
        changed.properties[2].status = "arquivado";
        const result = await db.query<{ version: number }>(
          "select public.save_site_data($1::jsonb,1) as version",
          [JSON.stringify(changed)],
        );
        assert.equal(result.rows[0].version, 2);
        assert.equal((await read()).site.properties.length, 4);
        await db.query(
          "insert into storage.objects(bucket_id) values('site-images')",
        );
        await role("anon");
        const publicData = await read();
        assert.equal(publicData.site.properties.length, 1);
        assert.equal(publicData.site.properties[0].id, "imovel-4");
        assert.equal(
          (
            await db.query(
              "select * from public.property_photos where property_id='imovel-1'",
            )
          ).rows.length,
          0,
        );
        assert.equal(
          (
            await db.query(
              "select * from public.properties where slug='apartamento-jardim-paulista'",
            )
          ).rows.length,
          0,
        );
      },
    );
    await t.test(
      "versão antiga é rejeitada sem sobrescrever conteúdo",
      async () => {
        await role("authenticated", admin);
        await assert.rejects(
          db.query("select public.save_site_data($1::jsonb,1)", [
            JSON.stringify(initialData),
          ]),
          /VERSION_CONFLICT/,
        );
        assert.equal((await read()).version, 2);
        assert.equal((await read()).site.properties[0].status, "rascunho");
      },
    );
    await t.test(
      "erro durante escrita reverte a transação inteira",
      async () => {
        const invalid = structuredClone(initialData);
        invalid.settings.brand = "Não deve persistir";
        invalid.properties[0].rent = -1;
        await assert.rejects(
          db.query("select public.save_site_data($1::jsonb,2)", [
            JSON.stringify(invalid),
          ]),
        );
        const state = await read();
        assert.equal(state.version, 2);
        assert.equal(state.site.settings.brand, initialData.settings.brand);
        assert.equal(state.site.properties.length, 4);
      },
    );
    await t.test(
      "versão nula, escrita direta e payload parcial não contornam as proteções",
      async () => {
        await assert.rejects(
          db.query("select public.save_site_data($1::jsonb,null)", [
            JSON.stringify(initialData),
          ]),
          /VERSION_CONFLICT/,
        );
        await assert.rejects(
          db.query("update public.settings set data='{}' where id=1"),
        );
        await assert.rejects(
          db.query("select public.save_site_data($1::jsonb,2)", [
            JSON.stringify({ settings: initialData.settings }),
          ]),
          /INVALID_PAYLOAD/,
        );
        assert.equal((await read()).version, 2);
      },
    );
    await t.test(
      "RPC rejeita links ativos, campos ausentes, valores negativos e conteúdo inválido",
      async () => {
        for (const mutate of [
          (data: typeof initialData) => {
            data.settings.instagram = "javascript:alert(1)";
          },
          (data: typeof initialData) => {
            Object.assign(data.settings, {
              privateNotes: "dado privado indevido",
            });
          },
          (data: typeof initialData) => {
            data.properties[0].condo = -10;
          },
          (data: typeof initialData) => {
            data.properties[0].bathrooms = 1.5;
          },
          (data: typeof initialData) => {
            data.content.sections[0].id = "invalido" as never;
          },
          (data: typeof initialData) => {
            delete (data.settings as Partial<typeof data.settings>).primary;
          },
          (data: typeof initialData) => {
            data.properties[0].city = "";
          },
        ]) {
          const payload = structuredClone(initialData);
          mutate(payload);
          await assert.rejects(
            db.query("select public.save_site_data($1::jsonb,2)", [
              JSON.stringify(payload),
            ]),
            /INVALID_PAYLOAD/,
          );
        }
        assert.equal((await read()).version, 2);
      },
    );
    await t.test(
      "rascunho incompleto pode ser salvo sem ser publicado",
      async () => {
        const changed = (await read()).site;
        changed.properties[0] = {
          ...changed.properties[0],
          rent: 0,
          area: 0,
          city: "",
          description: "",
          images: [],
        };
        await db.query("select public.save_site_data($1::jsonb,2)", [
          JSON.stringify(changed),
        ]);
        assert.equal((await read()).version, 3);
      },
    );
  } finally {
    await db.close();
  }
});
