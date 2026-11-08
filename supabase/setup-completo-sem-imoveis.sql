-- BRAGA E BUZZO — instalação inicial completa, SEM imóveis demonstrativos.
-- Execute uma única vez no SQL Editor de um projeto Supabase novo.
-- Inclui segurança, Storage, configurações e conteúdo atual da advocacia.
-- Fotos locais continuam nos arquivos do site; este SQL guarda seus caminhos.
-- Não cria contas nem concede acesso administrativo automaticamente.
begin;
do $$ begin
    if to_regclass('public.settings') is not null or to_regclass('public.site_meta') is not null then
      raise exception 'O site já está inicializado neste banco. Operação cancelada para preservar os dados existentes.';
    end if;
  end $$;
-- Execute no SQL Editor de um projeto Supabase novo.
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

-- Aplicar depois de 001_site.sql, inclusive em bancos já inicializados. Não altera conteúdo existente.
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

insert into public.settings(id,data) values(1,'{"showDemoNotice":false,"brand":"Braga e Buzzo","logo":"/logo-transparent.png","primary":"#244f56","accent":"#c9ad83","whatsapp":"5519991620749","phone":"(19) 3621-7505","address":"Rua das Imbuias, nº 565, Jardim São Paulo, Americana-SP., CEP. 13.468-090.","hours":"Segunda à Sexta-feira das 8:30 às 17:00.","instagram":"","facebook":"","mapQuery":"Rua das Imbuias, 565, Jardim São Paulo, Americana - SP, 13468-090","whatsappGeneral":"Olá! Gostaria de mais informações sobre o atendimento.","whatsappService":"Olá! Tenho interesse no serviço de {servico} e gostaria de conversar.","whatsappProperty":"Olá! Tenho interesse no imóvel {titulo}. Poderiam me passar mais informações? {link}","entranceEyebrow":"PESSOAS, DIREITOS E NOVOS CAMINHOS","entranceTitle":"O próximo passo começa\ncom uma boa escolha.","entranceText":"Duas áreas de atuação. O mesmo compromisso com você.","lawTitle":"Advocacia","lawDescription":"Advocacia ética e de resultado","lawImage":"/images/empresa/fachada-renovada.png","lawButton":"Conheça a advocacia","estateTitle":"Imobiliária","estateDescription":"Encontre um novo lugar para viver, trabalhar e construir a sua história.","estateImage":"/images/empresa/fachada-renovada.png","estateButton":"Encontre seu imóvel","footerText":"Proximidade para entender. Cuidado para acompanhar.","entranceHeaderNote":"CONEXÕES QUE ABREM CAMINHOS","entranceBottomNote":"UM NOVO OLHAR PARA CADA NECESSIDADE.","entranceBottomText":"Escolha sua área e sinta-se em casa."}'::jsonb);
insert into public.site_content(id,data) values(1,'{"heroEyebrow":"BRAGA E BUZZO · ADVOCACIA","heroTitle":"Advocacia ética\ne de resultado","heroText":"","heroImage":"/images/empresa/fachada-renovada.png","heroButton":"Contato","aboutEyebrow":"ADVOGADOS ASSOCIADOS","aboutTitle":"Sobre nós","aboutText":"Com escritório estabelecido desde abril de 2.002, a Braga e Buzzo Advogados Associados, através de seus sócios, os advogados Luiz Gustavo Fornaziero Buzzo e Roberto Braga, sempre atuou com o objetivo de ser reconhecida por uma advocacia pessoal, de resultado e comprometida com a satisfação dos nossos clientes.\n\nOs diversos anos de profícua atuação nos garantem experiência, confiança e uma excelente imagem no meio jurídico.\n\nTemos como objetivo sempre prestar um atendimento direto e pessoal, buscando, com ética e transparência, soluções rápidas e eficazes para atender aos anseios de nossos clientes.\n\nCom amplo comprometimento social, nosso escritório sempre atuou também de maneira voluntária e solidária junto a diversas entidades filantrópicas de nossa cidade (APAE, Irmandade de Misericórdia e Lar Escola Vó Antonieta), reforçando nosso compromisso com uma sociedade mais justa e igualitária.","aboutImage":"/images/empresa/fachada-renovada.png","teamTitle":"Sócios","servicesTitle":"Serviços","contactTitle":"Contato","contactText":"E-mail: contato@bragaebuzzo.com.br","estateEyebrow":"BRAGA E BUZZO · IMOBILIÁRIA","estateTitle":"Um novo lugar.\nNovas possibilidades.","estateText":"Explore imóveis para alugar e encontre o espaço que combina com o seu próximo capítulo.","estateImage":"/images/empresa/fachada-renovada.png","catalogEyebrow":"ESPAÇOS PARA NOVAS HISTÓRIAS","catalogTitle":"Encontre o seu lugar.","estateDiscoverButton":"Encontre seu próximo endereço","teamEyebrow":"NOSSA EQUIPE","servicesEyebrow":"ÁREAS DE ATUAÇÃO","servicesText":"Visando uma advocacia de resultado e em constante aprimoramento, atuamos nas áreas administrativas, contenciosa e litigiosa, nas seguintes áreas:\n\nEm todos os nossos ramos de trabalho buscamos manter sempre um contato direto e pessoal com o cliente, focando nossa atuação em suas reais necessidades, para apresentarmos resultados rápidos, eficazes e práticos, com transparência, comprometimento e responsabilidade.","aboutCaption":"BRAGA E BUZZO ADVOGADOS ASSOCIADOS","contactEyebrow":"ESTAMOS POR PERTO","contactButton":"Fale pelo WhatsApp","propertyButton":"Tenho interesse","propertyAboutTitle":"Um pouco mais sobre este espaço.","propertyFeaturesTitle":"Detalhes que fazem a diferença","propertyLocationTitle":"O seu próximo bairro","propertyLocationText":"A localização é aproximada. Consulte o endereço e os detalhes pelo WhatsApp.","propertyPriceNote":"Fale com a nossa equipe e saiba mais.\nValores sujeitos a confirmação.","sections":[{"id":"inicio","label":"Início","visible":true},{"id":"sobre","label":"Sobre nós","visible":true},{"id":"equipe","label":"Sócios","visible":true},{"id":"servicos","label":"Serviços","visible":true},{"id":"contato","label":"Contato","visible":true}]}'::jsonb);
insert into public.lawyers(id,data,sort_order) values('luiz-gustavo-fornaziero-buzzo','{"id":"luiz-gustavo-fornaziero-buzzo","name":"Luiz Gustavo Fornaziero Buzzo","role":"OAB/SP. 184.762","bio":"Formação Acadêmica:\nBacharel em Direito pela Pontifícia Universidade Católica de Campinas - PUC (2000).\n\nCursos de Especialização:\n• Especialização Lato Sensu em Direito Processual Civil pela Universidade Metodista de Piracicaba – UNIMEP, 2002/2005.\n• Especialização Lato Sensu em Direito Previdenciário pela Escola Paulista de Direito – EPD, 2007/2008.\n\nExperiências:\n• Relator do Tribunal de Ética e Disciplina da OAB – Subseção de Americana-SP.\n• Diretor Tesoureiro da 48ª Subseção da OAB/SP - Americana, no triênio 2013/2015.\n• Presidente da APAE de Americana, 2012/2013.\n• Procurador jurídico da APAE de Americana.\n\nE-mail: luizgustavo@bragaebuzzo.com.br","image":"/images/lawyers/luiz-gustavo-fornaziero-buzzo.jpg"}'::jsonb,0);
insert into public.lawyers(id,data,sort_order) values('roberto-braga','{"id":"roberto-braga","name":"Roberto Braga","role":"OAB/SP. 209.986","bio":"Formação Acadêmica:\nBacharel em Direito pela Universidade São Francisco (2001).\n\nExperiências:\n• Relator do Tribunal de Ética e Disciplina da OAB – Subseção de Americana-SP, desde 2009.\n• Procurador Jurídico da APAE-Americana.\n\nE-mail: roberto@bragaebuzzo.com.br","image":"/images/lawyers/roberto-braga.jpg"}'::jsonb,1);
insert into public.services(id,data,sort_order) values('servico-1','{"id":"servico-1","title":"Direito Civil","description":"","button":"Conversar sobre este serviço"}'::jsonb,0);
insert into public.services(id,data,sort_order) values('servico-2','{"id":"servico-2","title":"Direito de Família","description":"","button":"Conversar sobre este serviço"}'::jsonb,1);
insert into public.services(id,data,sort_order) values('servico-3','{"id":"servico-3","title":"Direito Sucessório","description":"","button":"Conversar sobre este serviço"}'::jsonb,2);
insert into public.services(id,data,sort_order) values('servico-4','{"id":"servico-4","title":"Direito Imobiliário","description":"","button":"Conversar sobre este serviço"}'::jsonb,3);
insert into public.services(id,data,sort_order) values('servico-5','{"id":"servico-5","title":"Direito Previdenciário","description":"","button":"Conversar sobre este serviço"}'::jsonb,4);
insert into public.services(id,data,sort_order) values('servico-6','{"id":"servico-6","title":"Direito Trabalhista","description":"","button":"Conversar sobre este serviço"}'::jsonb,5);
-- Imóveis e fotos de imóveis ficam vazios para cadastro pelo painel.
update public.site_meta set version=1 where id=1;
commit;
