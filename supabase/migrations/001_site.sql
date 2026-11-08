-- Execute no SQL Editor de um projeto Supabase novo.
begin;
create table public.administrators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.administrators enable row level security;
create policy "Administrator sees own membership" on public.administrators for select to authenticated using (user_id = (select auth.uid()));
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.administrators where user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table public.site_meta (id integer primary key check (id=1), version bigint not null default 0);
insert into public.site_meta(id) values (1);
create table public.settings (id integer primary key check (id=1), data jsonb not null);
create table public.site_content (id integer primary key check (id=1), data jsonb not null);
create table public.lawyers (id text primary key, data jsonb not null, sort_order integer not null);
create table public.services (id text primary key, data jsonb not null, sort_order integer not null);
create table public.properties (
  id text primary key,
  data jsonb not null,
  sort_order integer not null,
  slug text generated always as (data->>'slug') stored not null unique,
  status text generated always as (data->>'status') stored not null,
  constraint valid_status check (status in ('rascunho','publicado','alugado','arquivado')),
  constraint valid_slug check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint valid_rent check ((data->>'rent')::numeric >= 0 and (status <> 'publicado' or (data->>'rent')::numeric > 0)),
  constraint valid_area check ((data->>'area')::numeric >= 0 and (status <> 'publicado' or (data->>'area')::numeric > 0))
);
create table public.property_photos (
  id uuid primary key default gen_random_uuid(),
  property_id text not null references public.properties(id) on delete cascade,
  url text not null check (url ~ '^https://'),
  sort_order integer not null
);
create index property_photos_property_id_idx on public.property_photos(property_id);
create index properties_status_idx on public.properties(status);

do $$
declare tbl text;
begin
  foreach tbl in array array['site_meta','settings','site_content','lawyers','services','properties','property_photos'] loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('create policy "Admin manages" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',tbl);
  end loop;
  foreach tbl in array array['site_meta','settings','site_content','lawyers','services'] loop
    execute format('create policy "Public reads" on public.%I for select to anon, authenticated using (true)', tbl);
  end loop;
end;
$$;
create policy "Public reads published properties" on public.properties for select to anon, authenticated using (status='publicado');
create policy "Public reads published photos" on public.property_photos for select to anon, authenticated using (
  exists(select 1 from public.properties p where p.id=property_id and p.status='publicado')
);
grant select on public.site_meta,public.settings,public.site_content,public.lawyers,public.services,public.properties,public.property_photos to anon;
grant select,insert,update,delete on public.site_meta,public.settings,public.site_content,public.lawyers,public.services,public.properties,public.property_photos to authenticated;
grant select on public.administrators to authenticated;

create or replace function public.get_site_data() returns jsonb language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('version',m.version,'site',jsonb_build_object(
    'settings',(select data from public.settings where id=1),
    'content',(select data from public.site_content where id=1),
    'lawyers',coalesce((select jsonb_agg(data order by sort_order) from public.lawyers),'[]'::jsonb),
    'services',coalesce((select jsonb_agg(data order by sort_order) from public.services),'[]'::jsonb),
    'properties',coalesce((select jsonb_agg(p.data || jsonb_build_object('images',coalesce((select jsonb_agg(url order by sort_order) from public.property_photos where property_id=p.id),'[]'::jsonb)) order by p.sort_order) from public.properties p),'[]'::jsonb)
  )) from public.site_meta m where m.id=1;
$$;
revoke all on function public.get_site_data() from public;
grant execute on function public.get_site_data() to anon,authenticated;

-- A escrita completa é atômica. O bloqueio e a versão evitam perda de alterações concorrentes.
create or replace function public.save_site_data(payload jsonb, expected_version bigint) returns bigint
language plpgsql security invoker set search_path='' as $$
declare current_version bigint; item jsonb; position bigint; image jsonb; image_position bigint;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário' using errcode='42501'; end if;
  select version into current_version from public.site_meta where id=1 for update;
  if current_version <> expected_version then raise exception 'VERSION_CONFLICT'; end if;
  if nullif(trim(payload->'settings'->>'brand'),'') is null then raise exception 'Nome da marca obrigatório'; end if;
  if (payload->'settings'->>'primary') !~ '^#[0-9a-fA-F]{6}$' or (payload->'settings'->>'accent') !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Cores inválidas'; end if;
  insert into public.settings(id,data) values(1,payload->'settings') on conflict(id) do update set data=excluded.data;
  insert into public.site_content(id,data) values(1,payload->'content') on conflict(id) do update set data=excluded.data;
  delete from public.lawyers;
  insert into public.lawyers(id,data,sort_order) select value->>'id', value, ordinality::integer from jsonb_array_elements(payload->'lawyers') with ordinality;
  delete from public.services;
  insert into public.services(id,data,sort_order) select value->>'id', value, ordinality::integer from jsonb_array_elements(payload->'services') with ordinality;
  delete from public.properties; -- fotos são removidas por cascade
  for item, position in select value,ordinality from jsonb_array_elements(payload->'properties') with ordinality loop
    if item->>'status'='publicado' and jsonb_array_length(item->'images')=0 then raise exception 'Imóvel publicado precisa de foto'; end if;
    insert into public.properties(id,data,sort_order) values(item->>'id',item-'images',position::integer);
    for image,image_position in select value,ordinality from jsonb_array_elements(item->'images') with ordinality loop
      insert into public.property_photos(property_id,url,sort_order) values(item->>'id',image #>> '{}',image_position::integer);
    end loop;
  end loop;
  update public.site_meta set version=current_version+1 where id=1;
  return current_version+1;
end;
$$;
revoke all on function public.save_site_data(jsonb,bigint) from public,anon;
grant execute on function public.save_site_data(jsonb,bigint) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('site-images','site-images',true,8388608,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict(id) do nothing;
create policy "Public reads site images" on storage.objects for select to anon,authenticated using(bucket_id='site-images');
create policy "Admins upload site images" on storage.objects for insert to authenticated with check(bucket_id='site-images' and public.is_admin());
create policy "Admins update site images" on storage.objects for update to authenticated using(bucket_id='site-images' and public.is_admin()) with check(bucket_id='site-images' and public.is_admin());
create policy "Admins delete site images" on storage.objects for delete to authenticated using(bucket_id='site-images' and public.is_admin());
commit;
