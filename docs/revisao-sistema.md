# Revisão do sistema — 23/10/2026

## Resultado e alcance

Revisão de código, dependências, banco PostgreSQL local, compilação e interface demonstrativa no navegador, incluindo viewport móvel de 390 × 844. Foram corrigidos problemas confirmados de integridade e adicionadas proteções preventivas. Não foi confirmada uma forma de um visitante anônimo editar conteúdo ou promover sua conta a administrador nos testes executados.

Isso não é uma garantia de ausência de vulnerabilidades nem uma auditoria de infraestrutura: não há projeto Supabase ou hospedagem de produção conectado. Auth, e-mails, Storage real, limites de requisição, backups, TLS e aplicação dos cabeçalhos no domínio final ainda precisam ser verificados.

## Achados e correções

| Prioridade | Achado | Correção e estado |
| --- | --- | --- |
| Média — integridade | Administradores podiam escrever diretamente nas tabelas pela API, contornando a conferência de versão da RPC. Uma versão nula também passava pela comparação anterior. Não era uma elevação de privilégio de visitantes. | Migração 002 revoga DML direto dos papéis de navegador e exige RPC autorizada, com comparação de versão que rejeita NULL. Testado localmente; aplicar no Supabase. |
| Média — integridade | Dados enviados fora do formulário podiam contornar validações de valores, URLs, campos e seções. Conteúdo inválido podia prejudicar o carregamento público. | Validação completa antes de escrever, tanto no cliente como na RPC. Números negativos, campos desconhecidos, protocolos perigosos, fotos inválidas, campos ausentes e cadastros publicados incompletos são rejeitados. A transação preserva os dados anteriores em caso de falha. |
| Preventiva — configuração | Uma chave privilegiada inserida por engano nas variáveis VITE seria incorporada ao frontend. Nenhuma chave real foi encontrada/configurada nesta revisão. | Build e inicialização rejeitam `sb_secret_` e JWT de papel diferente de `anon`. Continua obrigatório manter credenciais privilegiadas fora do frontend. |
| Preventiva — navegador | A configuração da hospedagem não tinha política de conteúdo nem proteção de enquadramento. | Cabeçalhos CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy e HSTS preparados na Vercel. Aplicação efetiva precisa ser conferida após deploy. |
| Técnica | Um upload concluído durante uma gravação poderia deixar uma edição mais recente marcada incorretamente como salva. | Controle de revisão do formulário mantém o aviso de alterações pendentes; envio duplicado é bloqueado durante salvamento. |
| Técnica | O upload conferia apenas o tamanho e o MIME informado pelo arquivo. | O navegador também tenta decodificar a imagem e limita dimensões. Bucket/RLS seguem responsáveis pela autorização e pelos limites de armazenamento. A checagem do navegador não é um antivírus nem substitui as políticas do servidor. |
| Técnica | Dados de resposta eram convertidos diretamente para TypeScript, sem conferência em execução. | Resposta e versão são validadas antes do uso; falhas inesperadas têm tela de recuperação em vez de página vazia. |
| Desempenho | O painel era incluído no carregamento inicial das páginas públicas. | Painel separado em chunk sob demanda, com cerca de 32 KB antes de compressão na compilação verificada. |
| Visual e usabilidade | A lista administrativa não tinha pesquisa/status e alguns textos pequenos tinham contraste baixo. | Busca por título, cidade, bairro e referência; filtro por status; contador de resultados; estado vazio; maior contraste; imóveis organizados em linhas mais legíveis no celular. Edição com filtro ativo preserva os demais cadastros. |
| Usabilidade | O painel ainda oferecia campos de chamadas que já tinham sido retiradas da entrada por solicitação do cliente. | Controles sem efeito retirados e descrição para buscadores identificada corretamente. Os dados históricos foram preservados. |

O acesso continua exclusivamente pela URL `/admin`, sem links públicos. A página recebe indicação de não indexação. Ocultar a URL e impedir indexação não são controles de acesso: autenticação, lista de administradores e permissões do banco fazem essa proteção.

## Evidências

- `npm audit`: zero vulnerabilidades conhecidas reportadas nas dependências instaladas na data da revisão. Isso não verifica falhas de lógica da aplicação.
- `npm test`: 18 testes passando. Incluem permissões de visitante/usuário comum, bloqueio de autopromoção, publicação e referências de fotos não publicadas, rollback, conflitos de versão, versão nula, DML direto, URLs perigosas, tipos/valores inválidos, chaves privilegiadas e configuração de cabeçalhos.
- `npm run build`: TypeScript e compilação concluídos. Gera chunk separado para o painel.
- Navegador: pesquisa por bairro, filtro por status, edição e salvamento de um imóvel com pesquisa ativa, preservação dos quatro cadastros, contador/estado vazio, meta `noindex, nofollow` e layout móvel sem overflow horizontal.
- Os testes de banco executam as migrações reais em PGlite, com contratos mínimos de Auth e Storage simulados. Não substituem testes no serviço Supabase real.

## Para ativar os reforços

Em banco novo: executar `001_site.sql`, `002_hardening.sql`, depois `seed.sql`. Em banco já inicializado: executar apenas `002_hardening.sql`. Não repetir a carga demonstrativa em dados reais. A migração não altera conteúdo existente, mas futuras gravações precisam respeitar o contrato de dados atual.

O arquivo `vercel.json` configura a hospedagem; em outro provedor, reproduzir os cabeçalhos e o fallback das rotas. Um domínio personalizado para a API Supabase precisa ser acrescentado ao `connect-src` da CSP. Não colocar CSP de produção no servidor de desenvolvimento: o Vite precisa do seu próprio carregamento de módulos e atualização durante a edição.

## Pendências antes da publicação

1. Conectar Supabase, aplicar migrações e confirmar políticas no Security Advisor. Testar Auth, recuperação, SMTP, uploads, usuário sem permissão, expiração de sessão e tentativas de escrita pela API real.
2. Conferir limites de autenticação, políticas de senha, proteção da conta responsável, backups e restauração. MFA dos usuários administrativos do site exigirá um fluxo próprio de inscrição/desafio antes de ser obrigatório; ele não foi adicionado nesta revisão.
3. Confirmar HTTPS, cabeçalhos, bloqueio de enquadramento, integrações permitidas pela CSP e fallback das URLs no domínio definitivo. Não publicar a demonstração como se fosse uma administração persistente.
4. Substituir serviços, perfis, anúncios, imagens e contatos demonstrativos. O Storage público deve conter apenas imagens destinadas à publicação; ocultar um imóvel não torna seu arquivo confidencial.
5. Melhorias futuras: pré-renderização das páginas para SEO/prévias sociais, dimensionamento otimizado das imagens, limpeza de uploads sem referência, paginação para catálogos maiores, registro de alterações administrativas e proteção de rascunhos ao sair pelo histórico do navegador. Esses itens não foram apresentados como implementados.

Referências utilizadas: [checklist de produção do Supabase](https://supabase.com/docs/guides/deployment/going-into-prod) e [RLS e chaves que ignoram políticas](https://supabase.com/docs/guides/database/postgres/row-level-security). As configurações reais do projeto devem ser conferidas separadamente da revisão do código.
