-- Para bancos já inicializados: atualiza apenas as fotos institucionais da imobiliária.
-- Não altera fotos de anúncios nem outros conteúdos. Recarregue o painel após executar.
begin;
select version from public.site_meta where id=1 for update;
update public.settings
set data=jsonb_set(data,'{estateImage}','"/images/empresa/fachada-renovada.png"'::jsonb)
where id=1;
update public.site_content
set data=jsonb_set(data,'{estateImage}','"/images/empresa/fachada-renovada.png"'::jsonb)
where id=1;
update public.site_meta set version=version+1 where id=1;
commit;
