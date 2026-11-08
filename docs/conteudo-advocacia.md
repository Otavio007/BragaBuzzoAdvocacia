# Conteúdo da advocacia

Fonte: http://bragaebuzzo.com.br/advogados-associados/

Conteúdo consultado e integrado em 01/11/2026. A leitura direta por HTTP retornou a página original. Nenhum script, formulário PHP ou rastreador do site antigo foi incorporado ao projeto.

- Início: frase “Advocacia ética e de resultado” e botão Contato.
- Sobre nós: os quatro parágrafos originais, preservados integralmente.
- Sócios: Luiz Gustavo Fornaziero Buzzo (OAB/SP. 184.762) e Roberto Braga (OAB/SP. 209.986), com formação, especializações, experiências e e-mails originais. Apenas a apresentação em parágrafos e listas foi adaptada ao novo layout. Os cargos e as datas foram transcritos da fonte, sem supor atualizações.
- Fotos dos sócios: cópias locais dos arquivos públicos `/img/luiz-gustavo-fornaziero-buzzo.jpg` e `/img/roberto-braga.jpg` do site antigo.
- Serviços: os dois parágrafos e as seis áreas originais. Como a fonte não tinha descrições individuais, os cadastros não receberam descrições inventadas. Cada área mantém seu contato contextualizado pelo WhatsApp.
- Contatos: WhatsApp (19) 99162-0749; telefone (19) 3621-7505; contato@bragaebuzzo.com.br; funcionamento de segunda a sexta, das 8:30 às 17:00; Rua das Imbuias, nº 565, Jardim São Paulo, Americana-SP, CEP 13.468-090. O mapa usa o endereço da fonte.

Os contatos gerais continuam compartilhados com a imobiliária, conforme a estrutura acordada para o painel. O catálogo imobiliário permanece demonstrativo. A imagem institucional da entrada, do banner da advocacia e da seção Sobre nós usa a fachada editada e aprovada pelo cliente, com limpeza digital da calçada e renovação da pintura do prédio ao fundo, armazenada em `public/images/empresa/fachada-renovada.png`.

Os dados de prévia estão em `src/data.ts`, e a carga inicial `supabase/seed.sql` foi atualizada. Não reaplicar essa carga em um banco já inicializado: nesse caso, atualizar o conteúdo pelo painel para preservar os cadastros reais.

Verificação: comparação dos quatro parágrafos de apresentação e dos dois parágrafos de serviços com o HTML da fonte; comparação da ordem e dos nomes das seis áreas; revisão no navegador dos perfis, contatos e links de WhatsApp. Compilação e suíte de 18 testes aprovadas.
