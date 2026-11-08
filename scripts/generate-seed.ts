import { writeFileSync } from "node:fs";
import { initialData } from "../src/data.ts";
const literal = (value: unknown) =>
  `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
const str = (value: string) => `'${value.replace(/'/g, "''")}'`;
const lines = [
  `-- Conteúdo demonstrativo. Aplicar uma vez, depois de 001_site.sql.\nbegin;\nlock table public.site_meta in exclusive mode;\ndo $$ begin if (select version from public.site_meta where id=1) <> 0 then raise exception 'Carga inicial já executada; operação cancelada para preservar dados.'; end if; end $$;`,
  `insert into public.settings(id,data) values(1,${literal(initialData.settings)});`,
  `insert into public.site_content(id,data) values(1,${literal(initialData.content)});`,
];
for (const table of ["lawyers", "services"] as const)
  initialData[table].forEach((item, i) =>
    lines.push(
      `insert into public.${table}(id,data,sort_order) values(${str(item.id)},${literal(item)},${i});`,
    ),
  );
initialData.properties.forEach(({ images, ...item }, i) => {
  lines.push(
    `insert into public.properties(id,data,sort_order) values(${str(item.id)},${literal(item)},${i});`,
  );
  images.forEach((url, j) =>
    lines.push(
      `insert into public.property_photos(property_id,url,sort_order) values(${str(item.id)},${str(url)},${j});`,
    ),
  );
});
lines.push("update public.site_meta set version=1 where id=1;\ncommit;");
writeFileSync(
  new URL("../supabase/seed.sql", import.meta.url),
  lines.join("\n"),
);
console.log("Carga inicial gerada em supabase/seed.sql.");
