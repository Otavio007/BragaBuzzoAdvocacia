-- Execute DEPOIS da instalação e de criar seu usuário em Authentication > Users.
-- Substitua somente o e-mail abaixo pelo e-mail da conta criada.
do $$
declare
  admin_email text := 'SEU-EMAIL-AQUI';
  admin_id uuid;
begin
  select id into admin_id from auth.users where lower(email) = lower(trim(admin_email));
  if admin_id is null then
    raise exception 'Conta não encontrada. Informe o e-mail correto e crie o usuário em Authentication > Users primeiro.';
  end if;
  insert into public.administrators(user_id) values(admin_id) on conflict do nothing;
end $$;
