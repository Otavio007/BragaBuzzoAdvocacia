-- Aplicar depois de 001_site.sql, inclusive em bancos já inicializados. Não altera conteúdo existente.
begin;
create or replace function public.site_safe_url(value text, local_asset boolean default false) returns boolean
language sql immutable set search_path='' as $$
 select value is not null and (value='' or (
   value !~ '[[:space:][:cntrl:]]' and position(chr(92) in value)=0 and (
     (local_asset and left(value,1)='/' and left(value,2)<>'//') or
     value ~ '^https://[a-zA-Z0-9][a-zA-Z0-9.-]*(:[0-9]{1,5})?([/?#][^[:space:]]*)?$'
   )
 ));
$$;
create or replace function public.site_validate_record(value jsonb, schema jsonb) returns void
language plpgsql set search_path='' as $$
declare field text; kind jsonb;
begin
 if jsonb_typeof(value) is distinct from 'object' then raise exception 'INVALID_PAYLOAD: objeto inválido'; end if;
 if exists(select 1 from jsonb_object_keys(value) as k(name) where not (schema ? k.name)) then raise exception 'INVALID_PAYLOAD: campo desconhecido'; end if;
 for field,kind in select * from jsonb_each(schema) loop
   if kind #>> '{}' = 'nullable_number' then
     if not (value ? field) or jsonb_typeof(value->field) not in ('number','null') then raise exception 'INVALID_PAYLOAD: campo % inválido',field; end if;
   elsif jsonb_typeof(value->field) is distinct from (kind #>> '{}') then raise exception 'INVALID_PAYLOAD: campo % inválido',field;
   end if;
   if jsonb_typeof(value->field)='string' and length(value->>field)>50000 then raise exception 'INVALID_PAYLOAD: texto muito longo'; end if;
 end loop;
end;
$$;
create or replace function public.site_validate_payload(payload jsonb) returns void
language plpgsql set search_path='' as $$
declare item jsonb; setting text; asset text; field text; count_ids integer;
begin
 perform public.site_validate_record(payload,'{"settings":"object","content":"object","lawyers":"array","services":"array","properties":"array"}'::jsonb);
 if octet_length(payload::text)>4000000 then raise exception 'INVALID_PAYLOAD: limite de dados excedido'; end if;
 -- Contrato de tipos dos dados publicados pelo site.
 perform public.site_validate_record(payload->'settings','{"showDemoNotice":"boolean","brand":"string","logo":"string","primary":"string","accent":"string","whatsapp":"string","phone":"string","address":"string","hours":"string","instagram":"string","facebook":"string","mapQuery":"string","whatsappGeneral":"string","whatsappService":"string","whatsappProperty":"string","entranceEyebrow":"string","entranceTitle":"string","entranceText":"string","lawTitle":"string","lawDescription":"string","lawImage":"string","lawButton":"string","estateTitle":"string","estateDescription":"string","estateImage":"string","estateButton":"string","footerText":"string","entranceHeaderNote":"string","entranceBottomNote":"string","entranceBottomText":"string"}'::jsonb);
 perform public.site_validate_record(payload->'content','{"heroEyebrow":"string","heroTitle":"string","heroText":"string","heroImage":"string","heroButton":"string","aboutEyebrow":"string","aboutTitle":"string","aboutText":"string","aboutImage":"string","teamTitle":"string","servicesTitle":"string","contactTitle":"string","contactText":"string","estateEyebrow":"string","estateTitle":"string","estateText":"string","estateImage":"string","catalogEyebrow":"string","catalogTitle":"string","estateDiscoverButton":"string","teamEyebrow":"string","servicesEyebrow":"string","servicesText":"string","aboutCaption":"string","contactEyebrow":"string","contactButton":"string","propertyButton":"string","propertyAboutTitle":"string","propertyFeaturesTitle":"string","propertyLocationTitle":"string","propertyLocationText":"string","propertyPriceNote":"string","sections":"array"}'::jsonb);
 for item in select value from jsonb_array_elements(payload->'lawyers') loop perform public.site_validate_record(item,'{"id":"string","name":"string","role":"string","bio":"string","image":"string"}'::jsonb); end loop;
 for item in select value from jsonb_array_elements(payload->'services') loop perform public.site_validate_record(item,'{"id":"string","title":"string","description":"string","button":"string"}'::jsonb); end loop;
 for item in select value from jsonb_array_elements(payload->'properties') loop perform public.site_validate_record(item,'{"id":"string","slug":"string","title":"string","description":"string","city":"string","neighborhood":"string","type":"string","rent":"number","condo":"nullable_number","tax":"nullable_number","area":"number","bedrooms":"number","bathrooms":"number","parking":"number","features":"array","status":"string","featured":"boolean","images":"array"}'::jsonb); end loop;
 if nullif(trim(payload->'settings'->>'brand'),'') is null then raise exception 'INVALID_PAYLOAD: marca obrigatória'; end if;
 if (payload->'settings'->>'primary') !~ '^#[0-9a-fA-F]{6}$' or (payload->'settings'->>'accent') !~ '^#[0-9a-fA-F]{6}$' then raise exception 'INVALID_PAYLOAD: cores inválidas'; end if;
 if payload->'settings'->>'whatsapp' <> '' and regexp_replace(payload->'settings'->>'whatsapp','[^0-9]','','g') !~ '^[1-9][0-9]{9,14}$' then raise exception 'INVALID_PAYLOAD: WhatsApp inválido'; end if;
 foreach setting in array array['instagram','facebook'] loop
   if not public.site_safe_url(payload->'settings'->>setting) then raise exception 'INVALID_PAYLOAD: rede social inválida'; end if;
 end loop;
 foreach setting in array array['logo','lawImage','estateImage'] loop
   if not public.site_safe_url(payload->'settings'->>setting,true) then raise exception 'INVALID_PAYLOAD: imagem inválida'; end if;
 end loop;
 for field,asset in select key,value from jsonb_each_text(payload->'content') loop
   if right(field,5)='Image' and not public.site_safe_url(asset,true) then raise exception 'INVALID_PAYLOAD: imagem de conteúdo inválida'; end if;
 end loop;
 if jsonb_array_length(payload->'content'->'sections')<>5 then raise exception 'INVALID_PAYLOAD: seções inválidas'; end if;
 select count(distinct value->>'id') into count_ids from jsonb_array_elements(payload->'content'->'sections');
 if count_ids<>5 then raise exception 'INVALID_PAYLOAD: seções duplicadas'; end if;
 for item in select value from jsonb_array_elements(payload->'content'->'sections') loop
   perform public.site_validate_record(item,'{"id":"string","label":"string","visible":"boolean"}'::jsonb);
   if item->>'id' not in ('inicio','sobre','equipe','servicos','contato') then raise exception 'INVALID_PAYLOAD: seção desconhecida'; end if;
 end loop;
 foreach setting in array array['lawyers','services','properties'] loop
   if jsonb_array_length(payload->setting)>1000 then raise exception 'INVALID_PAYLOAD: muitos cadastros'; end if;
   for item in select value from jsonb_array_elements(payload->setting) loop
     if nullif(trim(item->>'id'),'') is null then raise exception 'INVALID_PAYLOAD: identificador obrigatório'; end if;
   end loop;
 end loop;
 for item in select value from jsonb_array_elements(payload->'lawyers') loop
   if nullif(trim(item->>'name'),'') is null or not public.site_safe_url(item->>'image',true) then raise exception 'INVALID_PAYLOAD: profissional inválido'; end if;
 end loop;
 for item in select value from jsonb_array_elements(payload->'services') loop
   if nullif(trim(item->>'title'),'') is null then raise exception 'INVALID_PAYLOAD: título do serviço obrigatório'; end if;
 end loop;
 for item in select value from jsonb_array_elements(payload->'properties') loop
   if nullif(trim(item->>'title'),'') is null then raise exception 'INVALID_PAYLOAD: título do imóvel obrigatório'; end if;
   foreach field in array array['rent','area','bedrooms','bathrooms','parking','condo','tax'] loop
     if jsonb_typeof(item->field)='number' and (item->>field)::numeric < 0 then raise exception 'INVALID_PAYLOAD: valor negativo'; end if;
   end loop;
   foreach field in array array['bedrooms','bathrooms','parking'] loop
     if (item->>field)::numeric <> trunc((item->>field)::numeric) then raise exception 'INVALID_PAYLOAD: quantidade fracionada'; end if;
   end loop;
   if jsonb_array_length(item->'images')>30 then raise exception 'INVALID_PAYLOAD: máximo de 30 fotos por imóvel'; end if;
   for asset in select value #>> '{}' from jsonb_array_elements(item->'images') loop
     if asset='' or not public.site_safe_url(asset) then raise exception 'INVALID_PAYLOAD: foto inválida'; end if;
   end loop;
   if exists(select 1 from jsonb_array_elements(item->'features') v where jsonb_typeof(v)<>'string') then raise exception 'INVALID_PAYLOAD: característica inválida'; end if;
   if item->>'status'='publicado' and (nullif(trim(item->>'city'),'') is null or nullif(trim(item->>'neighborhood'),'') is null or nullif(trim(item->>'description'),'') is null) then raise exception 'INVALID_PAYLOAD: imóvel publicado incompleto'; end if;
 end loop;
end;
$$;
revoke all on function public.site_safe_url(text,boolean),public.site_validate_record(jsonb,jsonb),public.site_validate_payload(jsonb) from public,anon,authenticated;

create or replace function public.save_site_data(payload jsonb, expected_version bigint) returns bigint
language plpgsql security definer set search_path='' as $$
declare current_version bigint; item jsonb; position bigint; image jsonb; image_position bigint;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário' using errcode='42501'; end if;
  perform public.site_validate_payload(payload);
  select version into current_version from public.site_meta where id=1 for update;
  if current_version is distinct from expected_version then raise exception 'VERSION_CONFLICT'; end if;
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

-- Toda gravação passa pela RPC validada e pela conferência de versão.
revoke insert,update,delete on public.site_meta,public.settings,public.site_content,public.lawyers,public.services,public.properties,public.property_photos from anon,authenticated;
revoke insert,update,delete on public.administrators from anon,authenticated;
revoke all on function public.save_site_data(jsonb,bigint) from public,anon;
grant execute on function public.save_site_data(jsonb,bigint) to authenticated;
commit;
