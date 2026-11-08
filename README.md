# Braga e Buzzo

Site em React + TypeScript + Vite: entrada com escolha de área, advocacia one page, catálogo de locações e painel unificado.

## Executar localmente

Requer Node.js 22.12+ ou 24.

```sh
npm install
npm run dev
```

Abra o endereço mostrado pelo Vite. Rotas: `/`, `/advocacia`, `/imobiliaria`, `/imobiliaria/imoveis/:slug`, `/admin`.

Sem variáveis de ambiente, funciona em **modo demonstração**. No painel, clique em “Explorar painel demonstrativo”. As edições atualizam a prévia na mesma aba após salvar e são perdidas ao recarregar. Os links de prévia usam a mesma aba para preservar a memória da demonstração. Não use este modo como administração de um site publicado.

## Conectar o Supabase

1. Crie um projeto Supabase.
2. Para um projeto novo, execute apenas `supabase/setup-completo-sem-imoveis.sql` no SQL Editor. Esse arquivo já reúne as duas migrações, as políticas de segurança, o bucket de imagens, as configurações e o conteúdo atual da advocacia. Não execute as migrações ou `seed.sql` novamente depois dele. As tabelas de imóveis e fotos de imóveis ficam vazias; o aviso de demonstração fica desativado. Em um banco já inicializado com a migração 001, aplique apenas `002_hardening.sql`, sem repetir a carga inicial.
3. Copie `.env.example` para `.env` e preencha a URL e a chave pública (anon/publishable) do projeto. **Nunca coloque service_role no frontend.**
4. Em Authentication → Users, crie ou convide o usuário administrador. Desabilite o cadastro público nas configurações do Auth. Cadastros comuns não recebem permissão de administrador.
5. Abra `supabase/configurar-admin.sql`, substitua `SEU-EMAIL-AQUI` pelo e-mail da conta criada e execute no SQL Editor. Como alternativa, copie o UUID do usuário e execute, substituindo o exemplo:

```sql
insert into public.administrators(user_id) values ('UUID-DO-USUARIO');
```

6. Configure a Site URL e as Redirect URLs no Supabase Auth: `http://127.0.0.1:5173/admin`, `http://127.0.0.1:5173/admin?recovery=1` e as respectivas URLs do domínio final. Configure SMTP para entrega confiável dos e-mails de recuperação.
7. Reinicie o Vite. A ausência de configuração usa demonstração; uma configuração presente mas inválida mostra erro, sem trocar silenciosamente para demonstração.
8. Entre em `/admin`. Revise contatos, textos e fotografias antes da publicação e cadastre os imóveis reais. O conteúdo da advocacia e os contatos foram importados do site antigo do cliente. Veja a origem em `docs/conteudo-advocacia.md`.

As imagens locais (logo, fachada e retratos) continuam em `public/` e são publicadas junto com o site. O SQL preserva seus caminhos, sem transferir os arquivos para o Storage.

Para atualizar a instalação completa após editar os dados iniciais: `node --import tsx scripts/generate-supabase-setup.ts`. Esse arquivo é exclusivo para instalação inicial e recusa uma nova execução sobre o banco do site já inicializado.

Para gerar novamente o arquivo SQL de demonstração após editar os dados iniciais: `npx tsx scripts/generate-seed.ts`. Não reaplique em um banco com conteúdo real.

## Dados, permissões e concorrência

- Tabelas separadas para configurações, conteúdo, equipe, serviços, imóveis e fotos. `administrators` vincula usuários autenticados autorizados. Inclusão e remoção de administradores são feitas pelo responsável pelo Supabase, nunca pelo site público.
- RLS protege todas as tabelas. Visitantes veem somente imóveis publicados e suas referências de fotos. URLs diretas de rascunhos, alugados e arquivados não mostram detalhes.
- `get_site_data` faz leitura consistente em uma única consulta. `save_site_data` verifica o administrador, valida o payload e grava o conjunto completo em transação, conferindo a versão (inclusive rejeitando versão nula). Em conflito, preserva o formulário. A migração 002 revoga gravações diretas nas tabelas pelo papel authenticated: a RPC com `search_path` fixo é a única via de escrita do conteúdo. Os helpers de validação não ficam expostos ao navegador.
- O bucket público `site-images` aceita apenas imagens de até 8 MB. Somente administradores podem enviar, editar ou excluir arquivos. Fotos não são documentos confidenciais: seus URLs permanecem acessíveis mesmo quando o anúncio é ocultado. Não envie arquivos privados.
- Retirar uma foto da galeria remove a referência ao salvar, mas não apaga o arquivo do bucket, evitando quebrar imagens reutilizadas. A limpeza de arquivos não utilizados deve ser feita pelo responsável no Supabase Storage.
- Edições de formulário permanecem no navegador até salvar. Ao sair/recarregar há aviso de alterações pendentes. Falhas de rede e validação não limpam o formulário.
- O IPTU cadastrado e o total informado são mensais. Valor vazio significa não informado; zero significa sem cobrança.

## Testes locais de banco

A suíte usa PostgreSQL embarcado (PGlite) e executa a migração SQL real, com contratos mínimos de Auth e Storage simulados. Verifica RLS para visitante e usuário comum, permissões de administrador, ocultação de imóveis e fotos, conflitos de versão e reversão de transações. Isso não substitui a verificação de Auth, e-mail e upload no projeto Supabase real.

## Verificação e publicação

```sh
npm test
npm run build
npm run preview
```

O build gera `dist/`. O arquivo `vercel.json` prepara as rotas para Vercel. Em outro host estático, configure fallback de rotas para `index.html` e preserve os caminhos dos arquivos estáticos. Defina as variáveis do Supabase no ambiente de build e configure os redirecionamentos do Auth para o domínio final. Não foi feito deploy.

A configuração da Vercel inclui CSP, bloqueio de enquadramento, proteção contra interpretação incorreta de arquivos, política de referência, restrições de câmera/microfone/localização e HSTS. A política permite Google Fonts, mapas, imagens HTTPS e os domínios padrão do Supabase. Se usar um domínio personalizado do Supabase, inclua sua origem em `connect-src` antes da publicação. Em outro host, replique esses cabeçalhos. Eles são configuração de hospedagem; a compilação não comprova sua aplicação em um domínio real.

A aplicação rejeita chaves privilegiadas no ambiente de build e no navegador. A área administrativa é carregada sob demanda e marcada como não indexável; isso não substitui a autenticação nem as políticas do banco. A revisão e seus limites estão em `docs/revisao-sistema.md`.

Checklist ao conectar o projeto: login e recuperação de senha; usuário sem permissão; uploads com e sem sessão; tentativa anônima de escrita; criação de imóvel em rascunho; publicação; retirada do catálogo ao alugar; falha de rede ao salvar; conflito entre dois administradores; WhatsApp com número real.

Imagens demonstrativas são carregadas do Unsplash; fontes são carregadas do Google Fonts, com alternativas locais. Para produção, substitua por imagens autorizadas do cliente e, se necessário, hospede fontes localmente. Os perfis e serviços são provisórios, sem credenciais ou promessas de resultado. O conteúdo deve ser revisado pelo escritório antes da publicação.

É uma SPA: navegação, títulos e descrições funcionam no navegador. Pré-renderização para indexação e prévias sociais completas pode ser adicionada quando hospedagem e domínio forem definidos.
