## Abrir, editar e publicar

Abra **a raiz deste repositório** no VS Code, Cursor ou outro editor que aceite projetos HTML/CSS/JavaScript. Requer Node.js 22. Não há dependências nem chaves obrigatórias.

- `public/`: HTML, CSS, JavaScript, imagens e PWA editáveis.
- `api/onu.js`: única função da Vercel, para conteúdos complementares da ONU.
- `scripts/dev.cjs`: servidor local, fora da raiz para evitar confusão com uma aplicação de servidor em produção.
- `build.cjs`: copia os fontes para `dist/`, sem modificá-los.
- `dist/`: resultado gerado e ignorado pelo Git; somente arquivos estáticos.
- `worker/`: adaptador da hospedagem anterior. `npm run build:worker` gera `worker-dist/`, separado da Vercel.

### No editor

Execute `npm run dev` e abra http://localhost:4173. Em ambientes remotos, configure `HOST=0.0.0.0` e encaminhe a porta 4173. `npm test` executa a validação funcional e os testes de publicação. Para conferir o pacote final, execute `npm run build` e depois `npm run preview`. Também é possível usar Live Server sobre `public/index.html`; nesse caso, os conteúdos online da ONU exigem a API, mas o restante da interface funciona.

### Vercel — nova publicação após erro 500

Importe `ZPoizon/Ecoa`, branch `main`, com **Root Directory na raiz**, **Framework Preset Other**, build `npm run build` e saída `dist`. O `vercel.json` fixa explicitamente o modo estático e mantém apenas `/api/onu` como função. Remova overrides antigos incompatíveis no painel e faça um novo deploy do commit atualizado; reutilizar o deploy antigo não atualiza a configuração. Não aponte a raiz do projeto para `public/` nem `dist/`.

A página inicial deve ser servida como HTML estático, mesmo quando a ONU estiver fora do ar. A imagem do erro `FUNCTION_INVOCATION_FAILED` confirma uma falha de função, mas a causa exata depende dos logs da implantação. Depois de publicar, confira `/`, `/manifest.json`, `/sw.js` e `/api/onu?ods=6`. Não há rewrite de todas as páginas para um servidor.

Opcional: `SITE_URL=https://seu-dominio` define os metadados de compartilhamento. Sem essa variável, o build usa o domínio informado pela Vercel. As rotas continuam por hash e nenhuma chave do localStorage é alterada. Se trocar de domínio, exporte/restaure a cópia do plano, pois o armazenamento pertence ao domínio anterior.

Referência: https://vercel.com/docs/project-configuration

# 🌱 Ecoa

**Pequenas ações, grandes mudanças.**

O **Ecoa** é um projeto acadêmico de Desenvolvimento Web, desenvolvido no curso de **Análise e Desenvolvimento de Sistemas (ADS)**. Seu objetivo é aproximar os **17 Objetivos de Desenvolvimento Sustentável (ODS)** da ONU da realidade das pessoas, apresentando informações acessíveis e sugestões de ações práticas para o dia a dia.

A ideia que orienta o projeto é simples:

> **Com o tempo e o dinheiro que tenho hoje, o que posso fazer?**

O Ecoa é uma iniciativa **independente e educativa**. Ele complementa, mas não substitui, as informações oficiais disponibilizadas pela Organização das Nações Unidas (ONU).

## 🔗 Acesse o projeto

**Versão publicada:** [Acessar o Ecoa](https://o-que-da-pra-fazer-ods.gardendogwood1.chatgpt.site)

> O endereço acima corresponde à versão publicada informada anteriormente e pode ser atualizado caso o projeto mude de domínio.

## 🎯 Objetivo

Mostrar que contribuir para o desenvolvimento sustentável não exige necessariamente muito tempo ou dinheiro. O Ecoa ajuda o usuário a conhecer os ODS, descobrir atividades adequadas à sua rotina e acompanhar as ações que decidiu realizar.

## ✨ Funcionalidades principais

### 🔎 Buscar uma ação

O usuário pode receber sugestões de ações sustentáveis utilizando filtros opcionais de:

- **Tempo disponível**, em minutos ou horas;
- **Orçamento máximo**, incluindo atividades gratuitas (R$ 0);
- **Local**, como casa ou rua;
- **ODS de interesse**, selecionando um ou mais objetivos.

Cada sugestão apresenta título, ODS relacionado, tempo estimado, custo, local, materiais necessários, instruções passo a passo e uma explicação de sua contribuição. É possível solicitar outra sugestão ou salvar a ação.

Quando a busca não encontra ações por causa do limite de tempo, o sistema pode sugerir um limite maior, preservando os outros filtros.

### 🧭 Explorar

A seção **Explorar** oferece atalhos rápidos e temas em linguagem simples, como alimentação, água, educação, consumo e iniciativas para o bairro. É uma alternativa para quem quer começar sem configurar uma busca detalhada.

### 📚 Guias dos 17 ODS

O Ecoa apresenta guias educativos dos 17 Objetivos de Desenvolvimento Sustentável, com:

- Explicações em linguagem acessível;
- Contexto e exemplos concretos;
- Metas oficiais resumidas e identificadas por sua numeração;
- Atividades práticas sugeridas pelo projeto;
- Links para fontes oficiais da ONU;
- Acesso direto à busca de ações relacionadas a cada ODS.

### ✅ Meu plano

O usuário pode salvar ações, marcar atividades como concluídas, remover itens e acompanhar seu progresso.

As informações são armazenadas localmente no navegador por meio do **localStorage**. Portanto, não há sincronização automática entre dispositivos.

### 🌐 Conteúdos da ONU Brasil

O site também pode apresentar iniciativas e histórias relacionadas aos ODS a partir de fontes da ONU Brasil. Essa consulta é complementar: o buscador principal continua funcionando caso o serviço externo esteja indisponível.

## 🛠️ Tecnologias utilizadas

A estrutura descrita do projeto utiliza:

- **HTML5** — organização semântica das páginas;
- **CSS3** — estilos e layout responsivo;
- **Vanilla JavaScript** — lógica de busca, interatividade e gerenciamento do plano;
- **JSON** — representação de dados;
- **localStorage** — persistência local de ações salvas;
- **Node.js** — execução dos testes automatizados;
- **Vercel Functions** — consulta complementar de conteúdos da ONU Brasil;
- **Git e GitHub** — versionamento e colaboração.

> Outras tecnologias e recursos, como PWA, gráficos, mapas e quiz, podem ser documentados aqui após a confirmação de sua implementação na versão atual do repositório.

## 📁 Estrutura do projeto

Conforme a organização inicialmente descrita:

```text
.
├── public/
│   ├── index.html    # Estrutura principal da interface
│   ├── style.css     # Estilos e responsividade
│   ├── acoes.js      # Catálogo de ações e filtros
│   ├── app.js        # Interface, busca e dados dos ODS
│   ├── guias.js      # Guias educativos dos 17 ODS
│   ├── plano.js      # Atalhos e plano pessoal
│   └── onu.js        # Integração com conteúdos da ONU Brasil
├── api/onu.js        # Função serverless da consulta à ONU Brasil
├── vercel.json       # Saída estática e configuração da função
├── scripts/dev.cjs        # Servidor local para testar a interface e a API
├── package.json      # Comandos de desenvolvimento, build e testes
└── validar.cjs       # Testes automatizados
```

O diretório `worker/` contém a implementação anterior para outra plataforma e não é utilizado pelo deploy da Vercel.

## 🚀 Como executar

1. Clone o repositório e abra a pasta do projeto no editor de sua preferência.
2. Para testar a interface, sirva a pasta `public/` utilizando um servidor HTTP local, como a extensão **Live Server** do VS Code.
3. Acesse o endereço local exibido pelo servidor no navegador.

> A consulta automática a conteúdos externos pode depender da disponibilidade da função serverless e da ONU Brasil. A interface e o catálogo de ações são independentes dessa consulta.

### Executar localmente

Na raiz do projeto, execute:

```bash
npm run dev
```

A interface fica disponível em `http://127.0.0.1:4173`.

### Publicar na Vercel

O projeto pode ser importado diretamente no painel da Vercel a partir do repositório Git:

- Diretório raiz (Root Directory): raiz do repositório (`.`)
- Plataforma (Framework Preset): Other
- Comando de build (Build Command): `npm run build`
- Diretório de saída (Output Directory): `dist` (gerado; não editar)

O arquivo `api/onu.js` fornece a consulta a conteúdos da ONU Brasil como função serverless. Não é necessário publicar o diretório `worker/`, específico da hospedagem anterior. Durante o build, os metadados de compartilhamento são atualizados para o domínio da implantação informado pela Vercel.

A busca de endereços, pontos do OpenStreetMap e mapa dependem dos provedores públicos externos; esses recursos precisam de conexão e podem ter limites ou indisponibilidades próprios. O plano, as preferências e os pontos cadastrados manualmente permanecem no armazenamento local do navegador.

### Executar os testes

Com o **Node.js** instalado, execute na raiz do projeto:

```bash
node validar.cjs
```

## ♿ Acessibilidade e experiência

O Ecoa busca oferecer uma experiência clara, acessível e responsiva, especialmente em dispositivos móveis. A navegação por teclado, a legibilidade dos textos e a facilidade de encontrar uma ação são prioridades do desenvolvimento.

## 📌 Organização do desenvolvimento

O projeto utiliza **Git e GitHub** para controle de versões e um quadro **Scrum no Trello** para organizar o backlog, as sprints, o desenvolvimento, os testes e as entregas.

## 📖 Fontes e referências

- [ONU Brasil — Objetivos de Desenvolvimento Sustentável](https://brasil.un.org/pt-br/sdgs)
- [Nações Unidas — Sustainable Development Goals](https://sdgs.un.org/goals)
- [ONU — Indicadores Globais dos ODS](https://unstats.un.org/sdgs/indicators/indicators-list/)

As **metas oficiais**, os **exemplos didáticos** e as **ações sugeridas pelo Ecoa** são apresentados como conteúdos de naturezas diferentes.

## 🌿 Sobre o projeto

O **Ecoa** nasceu da proposta de transformar conhecimento em atitude. Mais do que apresentar os ODS, o site procura responder a uma pergunta cotidiana: *qual pequena ação posso começar hoje?*

**Ecoa — Pequenas ações, grandes mudanças.**

## Documentação técnica do Ecoa

Guia de ações práticas da Agenda 2030. Execute `npm run dev` para abrir o site com suporte a PWA e API. Para hospedar no GitHub Pages, gere `dist/` com `npm run build` e publique seu conteúdo como raiz do site (a API ONU exige hospedagem de funções separada). Para validar os filtros, rode `node validar.cjs` na raiz do projeto.

## Estrutura
- public/index.html — interface e formulário
- public/style.css — layout responsivo
- public/acoes.js — dados e regras de filtragem
- public/app.js — interação e atualização da página
- validar.cjs — testes automatizados do catálogo e da filtragem
- BACKLOG.md — tarefas, critérios, histórico e registro de equipe

## Demonstração
Escolha até 15 min, sem gastar e na rua. Avance entre as duas ações. Troque para até 5 min para demonstrar o estado vazio. Limpe e clique no ODS 17 para demonstrar a navegação pelo catálogo.

## Histórico Git
Execute `git log --oneline --decorate` e `git tag -n`. O ZIP contém um arquivo projeto.bundle para restaurar a branch e as tags com `git clone -b entrega projeto.bundle projeto-com-historico`.

### Instalação e uso offline

Abra o site em HTTPS. No Android, procure **Instalar app** ou **Adicionar à tela inicial** no menu do navegador. No iPhone, abra no Safari e use **Compartilhar → Adicionar à Tela de Início**.

A primeira visita precisa de internet para armazenar os arquivos. Depois, a busca, os guias, o plano salvo e a exportação em PDF usam os arquivos locais. As consultas à ONU e a abertura de links externos exigem conexão.

Ao atualizar arquivos incluídos no cache, incremente a versão em `public/sw.js`. A nova versão entra em uso quando as abas da versão anterior forem fechadas.

### Backup do Meu plano em JSON (etapa 2)

Em **Meu plano → Guardar ou trazer um plano (JSON)**, baixe uma cópia ou importe um arquivo em outro aparelho. O PDF continua disponível para leitura e impressão. Não há envio do arquivo a um servidor nem sincronização automática entre aparelhos.

O JSON tem `projeto: "oqdpf"`, `versao: 1` e `acoes: [{ chave, concluida }]`. A chave segue o catálogo atual (`ODS:título`). O limite é 100 KB. Arquivos inválidos, versões incompatíveis, ações desconhecidas, duplicadas ou estados diferentes de booleanos são rejeitados por inteiro. Se os títulos do catálogo mudarem, será preciso prever migração de chaves antes de aceitar backups antigos.

A importação une os planos; mantém as ações existentes e considera concluída uma ação marcada como concluída em qualquer um dos dois. Um backup vazio não apaga nada. Uma falha ao persistir a importação mantém o estado anterior. O novo módulo também fica no cache offline (v2).

Teste automatizado: `node validar.cjs`. Teste manual: salve duas ações, conclua uma, exporte, abra em outro navegador e importe; confira os estados e o PDF. Repita com JSON inválido e com o mesmo arquivo; nenhuma ação deve ser perdida ou duplicada.

### Compartilhar uma ação (etapa 3)

No resultado da busca, **Compartilhar ação** abre o compartilhamento nativo quando disponível. Sem suporte ou em caso de falha, tenta copiar o texto e o link. Cancelar o compartilhamento nativo não copia nada. **Outras formas de compartilhar** oferece cópia direta e WhatsApp; se a área de transferência estiver bloqueada, um campo permite copiar manualmente. O WhatsApp abre uma mensagem pronta, mas a pessoa escolhe o destinatário e confirma o envio.

O link usa `#acao=` com a chave do catálogo e abre a sugestão exata, inclusive em subpastas. Links inválidos mostram uma mensagem. Não inclui o plano pessoal nem parâmetros da URL original. Mudanças nos títulos das ações exigem manter compatibilidade com as chaves antigas. O compartilhamento não muda as permissões da hospedagem: destinatários precisam ter acesso ao site.

Teste manual: buscar uma ação, copiar e abrir o link em outra aba; verificar título, passos e botão de salvar no plano. Testar também cancelamento do compartilhamento, WhatsApp e navegador sem permissão de cópia. Os testes automatizados de links e alternativas de compartilhamento estão em `validar.cjs`.

### Leitura e acessibilidade (etapa 4)

O botão de sol/lua no canto superior direito alterna diretamente o tema. No rodapé, **Preferências de leitura** oferece tema conforme o sistema (padrão), claro ou escuro; aumentar/reduzir fonte entre 100%, 112,5%, 125% e 150%; e restaurar o padrão. A escolha fica em `oqdpf-acessibilidade-v1`, sem alterar o plano. Se o armazenamento estiver bloqueado, funciona na sessão e informa a limitação. O modo automático acompanha mudanças do sistema; uma escolha explícita prevalece. O zoom do navegador continua disponível.

Há link para pular ao conteúdo, foco visível, rótulos nos controles, avisos de estado e nomes em texto junto aos ícones ODS. Os ícones oficiais não foram recoloridos. O layout permite quebra de texto e reorganização dos filtros. A preferência por movimento reduzido continua respeitada. Os novos arquivos fazem parte do cache v4.

Validação: `node validar.cjs` testa preferências, erros de armazenamento, limites de fonte, controles em DOM simulado, atualização pelo sistema e contraste calculado a partir das paletas CSS. As combinações testadas de texto atingem pelo menos 4,5:1; bordas de campos e foco, 3:1. Isso não substitui auditoria da página renderizada, leitor de tela ou testes com pessoas.

Pendente: Lighthouse de acessibilidade (meta >= 90, sem nota medida nesta etapa), leitor de tela, teclado em navegador real, celular, zoom 200% e largura de 320 px. A prévia local do projeto Worker não tem um comando de desenvolvimento configurado. Não declarar conformidade AA integral sem concluir a auditoria manual e automatizada no navegador.

### Ajuste visual: tema direto e seleção por cartões

O botão de tema funciona com clique, Enter ou Espaço, anuncia o estado e mantém a escolha salva. A troca usa transições de cor e animação curta de sol/lua; com movimento reduzido, a troca é imediata. A fonte fica nas preferências do rodapé, fora da navegação principal.

Os objetivos do filtro ficam visíveis, com seleção múltipla e botão para buscar logo abaixo. Nos guias, os 17 cartões substituem a lista suspensa; clicar abre o conteúdo e leva o foco ao título. As outras áreas expansíveis usam linhas clicáveis com sinais de mais/menos em vez das pequenas setas nativas. Conteúdos e funcionalidades anteriores foram preservados. Cache offline atualizado para v5.

### Quiz de afinidade com os ODS (etapa 5)

Acesse **Meu ODS** no menu. São cinco perguntas, uma por vez, com seleção única, botão de voltar e reinício. O resultado apresenta dois objetivos, motivos associados às respostas e botões para abrir o guia ou buscar ações daquele ODS. A busca a partir do quiz limpa os filtros anteriores e aplica o objetivo escolhido; salvar uma ação continua sendo uma decisão da pessoa.

Metodologia didática do projeto, sem avaliação oficial da ONU: cada resposta soma um ponto a cada objetivo associado. Os dois maiores totais aparecem no resultado; empates seguem a ordem numérica. Essa regra não mede impacto, personalidade ou importância dos objetivos. As 3.125 combinações possíveis foram testadas e todos os 17 ODS podem aparecer no resultado. As respostas ficam apenas em memória e são apagadas ao recarregar a página.

Sem dependências novas. Arquivos do quiz incluídos no cache offline v7. `node validar.cjs` verifica pontuação, entradas inválidas, desempates, cobertura dos objetivos e fluxo com DOM simulado (voltar, erro, reiniciar e atalhos). Conferência visual em navegador real, leitor de tela e celular ainda pendente.

### Marca Ecoa

**Pequenas ações, 17 objetivos.** Pergunta central: “Com o tempo e o dinheiro que tenho hoje, o que posso fazer?”. Projeto independente e educativo, não oficial da ONU. O SVG em `public/icons/ecoa.svg` é a origem dos ícones PNG (192, 512 e maskable), com três círculos concêntricos e um ponto central; o desenho fica dentro da área segura circular de 80% do maskable. O PDF reproduz o símbolo em vetores.

As chaves `oqdpf-plano-v1` e `oqdpf-acessibilidade-v1`, o identificador de backup `oqdpf`, a versão 1 e o ID do manifesto foram mantidos. Não é necessária migração: os planos, preferências e JSON antigos continuam sendo lidos diretamente. O prefixo de cache legado permanece para permitir a limpeza das versões antigas; versão de marca: v8. Não houve alteração da URL ou do repositório Ecoa.

### Desafio de 7 dias (etapa 6)

Escolha um ODS em **7 dias** e comece um roteiro educativo que reaproveita as ações gratuitas e práticas dos guias existentes. Há atividades de execução, registro, explicação, melhoria e planejamento. Um único desafio ativo fica salvo na chave `ecoa-desafio-v1`, separado do Meu plano.

O dia 1 é a data local de início. Somente o checklist da data atual pode ser marcado/desmarcado; datas passadas ficam fechadas e datas futuras ainda não podem ser marcadas. A sequência considera dias consecutivos concluídos até hoje ou ontem. Perder um dia interrompe a sequência sem apagar conclusões anteriores. Após sete datas, um novo desafio pode ser iniciado mediante confirmação de substituição. Sem sincronização entre dispositivos; o relógio do aparelho é a referência, não uma comprovação de realização.

A leitura é atualizada ao voltar à aba e a cada mudança de data detectada por verificação de um minuto. Falhas de armazenamento exibem aviso e não substituem o progresso anterior. Testes cobrem virada de ano, ano bissexto, limites, sequências, desfazer, persistência e fluxo simulado. Cache offline v9. Conferência visual em navegador real continua pendente.

### Painel de progresso e conquistas (etapa 7)

O **Meu plano** apresenta totais de ações concluídas, pendentes e ODS com pelo menos uma conclusão. Um gráfico de barras mostra o número de ações concluídas por objetivo, com valores escritos para não depender da percepção das cores. Apenas objetivos presentes no plano aparecem; todas as barras usam a mesma escala, cujo máximo é a maior contagem concluída.

Selos educativos: primeira ação, cinco ações diferentes, ações em cinco ODS e ações em todos os 17 ODS. As condições são visíveis e recalculadas após salvar, concluir, desmarcar, remover ou importar um plano. Os selos não são históricos/permanentes: refletem o estado atual, não representam certificação da ONU ou uma medida de impacto. O desafio de sete dias continua separado.

Não há chave nova de armazenamento nem alteração no JSON/PDF. O painel é derivado do plano já existente; recarregar o site reconstrói as contagens. Testes cobrem estados vazios, entradas desconhecidas, duplicatas, limiares, agrupamento e integração com alterações/importação. Cache offline v10. Testes visuais e com leitor de tela em navegador real permanecem pendentes.

### Calculadora de estimativas (etapa 8)

A seção **Calcule e acompanhe suas ações** oferece seis opções, sem modificar o catálogo:

- ODS 6, identificar desperdício na pia: cenário **após eliminar o gotejamento**, com referência de até 46 L/dia por torneira. CASAN, publicação de 08/12/2022: https://www.casan.com.br/noticia/index/url/casan-orienta-boas-praticas-para-uso-da-agua . A extrapolação considera o gotejamento ausente durante todos os dias informados. Apenas observar a torneira não gera essa economia. Não se aplica como limite universal a outros vazamentos.
- ODS 7, aproveitar a luz natural: potência em W × número de lâmpadas iguais × horas apagadas por dia × dias ÷ 1.000. Fórmula de energia da AGEMS (23/07/2015): https://www.agems.ms.gov.br/gastos-com-energia-eletrica-podem-ser-controlados-estimando-o-consumo-dos-aparelhos/ . Usar potência real, não equivalente. Não calcula tarifas nem emissões.

- Banho (ODS 6): minutos reduzidos × 10 L/min × total de banhos, usando a referência da CASAN acima. Vazão real pode variar; rejeita nova duração maior que a anterior.
- Aparelhos (ODS 7): mesma fórmula da AGEMS, aplicada a aparelhos iguais de potência aproximadamente constante. Não estima adequadamente equipamentos com ciclos variáveis pela potência nominal máxima.
- Alimentos (ODS 2): converte gramas de alimentos efetivamente aproveitados em quilogramas. Quantidade declarada pelo usuário, sem equivalência ambiental.
- Óleo (ODS 14): converte mililitros já entregues à coleta em litros. Quantidade declarada; não calcula água protegida.

Fontes consultadas em 11/11/2026. O usuário informa todos os valores; não há valores previamente preenchidos, gravação, envio ou soma ao painel de progresso. As demais ações não recebem estimativas numéricas. Valores são cenários educativos do Ecoa, não medições, metas oficiais da ONU ou economias certificadas. Campos aceitam zero dias/horas (resultado zero), validam limites e rejeitam valores vazios/negativos/não finitos; dias e quantidades são inteiros. Limites dos campos são de uso da ferramenta, não limites físicos.

Testes em `validar.cjs` cobrem fórmulas, conversão de unidades, decimais, zeros, limites, entradas inválidas e interface simulada. Cache offline v12 inclui os módulos; abrir as fontes requer internet. Teste visual em celular e navegador real permanece pendente.

### Na minha cidade (etapa 9)

Mapa Leaflet **1.9.4** carregado por CDN (unpkg, com SRI) somente ao clicar em “Abrir mapa interativo”. Base cartográfica OpenStreetMap com atribuição visível, sem geolocalização, geocodificação, busca automática de estabelecimentos ou backend novo. Documentação: https://leafletjs.com/reference-1.9.4.html e política dos mapas: https://operations.osmfoundation.org/policies/tiles/ (consultadas em 11/11/2026).

A base inicial é vazia: **nenhum ponto real foi verificado nesta etapa**. O usuário pode cadastrar locais públicos de coleta seletiva, hortas e doações com nome, cidade/UF, endereço, coordenadas, descrição, URL HTTPS da fonte e data de consulta. A fonte é informada pelo usuário, não verificada pelo Ecoa. Filtros por cidade (sem distinção de acentos) e categoria atualizam lista e mapa. A lista é uma alternativa navegável por teclado, com os mesmos dados e links externos.

Cadastros ficam em `localStorage`, chave `ecoa-pontos-v1`, sem alterar o Meu plano. Importação une por identificador e preserva o registro existente em caso de conflito. Remover pede confirmação. Falhas de leitura bloqueiam novos cadastros, preservando dados anteriores. Exportação inclui todos os pontos, mesmo com filtros ativos. Máximo 200 pontos/500 KB; campos, coordenadas, datas, links e IDs são validados antes da gravação. Conteúdo importado é exibido como texto, nunca HTML.

Arquivo `public/pontos-modelo.json`: `{"versao":1,"pontos":[]}`. Cada item de `pontos` deve conter:

- `id`: identificador único, até 80 caracteres;
- `nome`, `cidade`, `endereco`, `detalhes`: textos preenchidos (limites 120, 100, 240 e 600);
- `categoria`: `coleta`, `horta` ou `doacao`;
- `latitude` e `longitude`: números de -90 a 90 e -180 a 180;
- `fonte`: URL HTTPS (até 500 caracteres), sem credenciais;
- `consultadoEm`: data real no formato `AAAA-MM-DD`, não futura.

O formulário gera esse formato sem editar código. Não há sincronização entre pessoas ou aparelhos; transfira o JSON manualmente. Não inclua endereços privados ou informações pessoais.

PWA v13 guarda os módulos e o modelo JSON. **O mapa precisa de internet**: não armazenamos tiles externos no service worker nem fazemos download em massa. A lista/cadastro permanecem disponíveis offline após o primeiro carregamento do site. CDN ou tiles indisponíveis mostram mensagem de erro e mantêm a lista funcionando. Não há integração com o plano, cálculo de distância ou rotas nesta etapa.

Validação: `node validar.cjs`, testes de dados e interface/mapa simulados, sintaxe JS e build Worker. Testes visuais em celular, leitor de tela e carregamento real de CDN/tiles ainda pendentes; a infraestrutura de preview deste checkout Worker não oferece servidor de desenvolvimento configurado.

### Autocomplete reutilizável de endereços

`public/enderecos.js` conecta automaticamente inputs com `data-autocomplete-endereco`, inclusive inseridos depois no DOM. O atributo opcional `data-endereco-formato="cidade"` preenche cidade/UF; demais campos recebem o endereço. O evento `endereco-selecionado` fornece `detail` com rótulo, bairro, cidade, UF, latitude e longitude. `window.Enderecos.buscar(input)` executa a busca explícita e seleciona o primeiro resultado (formulário do mapa, inclusive Enter sem opção ativa).

Toda consulta e interpretação do Photon estão em `consultarProvedorEndereco`, único adaptador para trocar de provedor. Usa `lang=pt`, cinco resultados e viés de localização: centro aproximado do mapa (duas casas decimais), ou centro do Brasil. Resultados brasileiros recebidos são ordenados primeiro, sem excluir outros países. A cobertura e os nomes dependem do OpenStreetMap; campos ausentes não são inventados.

Debounce de 350 ms, mínimo de três caracteres, AbortController, proteção contra respostas atrasadas, timeout de 10 segundos e cache LRU em memória de 50 buscas (chave inclui o viés). Sem cache persistente das buscas e `fetch` com `cache: no-store`; o service worker v14 não intercepta o Photon. O JS do módulo é incluído no cache offline. Sem internet, os campos continuam aceitando texto livre.

Combobox/listbox ARIA, setas, Enter, Esc, Tab, suporte à composição de texto, toque e fechamento externo. Sugestões usam somente `textContent`, nunca HTML da API. A lista aparece sempre imediatamente abaixo do campo, no fluxo da página, com altura limitada e rolagem própria; respeita as cores do tema. A seleção de endereço público preenche coordenadas/cidade do cadastro; a busca do mapa centraliza o endereço sem inventar iniciativas.

O Photon público aceita uso razoável, não publica cota numérica garantida e pode limitar/bloquear uso intenso. Política: https://github.com/komoot/photon#demo-server ; parâmetros: https://github.com/komoot/photon/blob/master/docs/api-v1.md (consulta em 11/11/2026). Ao digitar, texto e centro aproximado são enviados ao Photon, conforme aviso no site. Nenhuma chave ou nova biblioteca foi adicionada.

Testes com API, relógio e DOM simulados cobrem debounce, mínimo, cancelamento, LRU, respostas tardias, vazio, falhas, segurança de texto, ARIA/teclado e busca explícita. Integração ao mapa reutiliza o módulo cidade. Acesso real ao Photon não pôde ser confirmado pela ferramenta de consulta; verificação visual no celular, leitor de tela e disponibilidade/CORS do provedor ficam pendentes.

### Correção de busca e CEP

O Photon público respondeu HTTP 400 a `lang=pt` em 11/11/2026: suporta `default`, `de`, `en` e `fr`. O adaptador tenta pt e, somente se a API rejeitar explicitamente o idioma, passa a default pelo restante da sessão. Consultas e chaves do cache ignoram caixa, acentos e espaços repetidos; os nomes exibidos preservam o retorno original.

Todos os campos com autocomplete aceitam CEP com oito dígitos, com ou sem hífen. O mesmo adaptador consulta ViaCEP (`https://viacep.com.br/`), sem chave. CEP incompleto não gera chamada; CEP inexistente mostra estado vazio. O endereço postal é geocodificado pelo Photon quando possível, com posição aproximada e comparação de cidade/UF. Sem coordenadas, o endereço continua disponível e o formulário pede preenchimento manual; coordenadas antigas são limpas. A pesquisa no mapa não centraliza uma posição inexistente. O ViaCEP não fornece latitude/longitude. Sem novo backend/biblioteca. PWA v15; Photon e ViaCEP não são interceptados pelo service worker.

Ajuste de apresentação: sugestões sempre abaixo do input, sem inversão para cima ou sobreposição aos campos seguintes. PWA v16.

### Lembretes opcionais (etapa 10)

Em **Meu plano → Lembre de dar o próximo passo**, escolha uma ação pendente e uma data/hora futura no fuso do aparelho. Há um lembrete por ação: reagendar substitui o anterior. É possível cancelar; concluir ou remover a ação elimina o lembrete local. Importação de plano recalcula os lembretes aplicáveis. A chave `ecoa-lembretes-v1` é independente das chaves existentes; o formato JSON/PDF do plano permanece compatível e não inclui lembretes.

Notificações começam desativadas. `Notification.requestPermission()` só é chamado pelo botão Ativar, nunca ao carregar a página, salvar uma ação ou agendar. Recusa, fechamento do pedido, indisponibilidade e falhas são tratados com mensagens. Desativar no Ecoa mantém os lembretes e para os avisos do sistema; não altera a permissão global do navegador. A notificação usa o service worker e abre somente `#meu-plano` no próprio site.

**Sem push ou novo backend:** a página verifica horários a cada 15 segundos e ao voltar à aba. Site fechado, navegador suspenso ou restrições do sistema impedem/atrasam avisos. Ao reabrir, lembretes vencidos aparecem na lista e são processados. O aviso do sistema é tentado uma vez e não é comprovante de entrega; falhas mantêm a indicação na página. Web Locks serializa verificações entre abas onde disponível; sem essa API, abas simultâneas podem exibir avisos duplicados (tag estável ajuda a agrupar notificações). Mudanças de plano em outra aba atualizam os controles.

O botão **Salvar no calendário (.ics)** gera um evento de 15 minutos com horário UTC equivalente ao horário local e alerta no início. O usuário deve importar e conferir o alerta no seu aplicativo. O calendário pode ignorar alarmes importados. Cancelar/reagendar no Ecoa não modifica eventos já importados. Sem envio de e-mail, dados ou integração externa automática.

Módulos `lembretes.js` (validação, datas, persistência, notificações e ICS) e `lembretes-ui.js` (interface e verificação). Sem bibliotecas novas. Cache offline v17. Fontes técnicas consultadas em 11/11/2026: https://developer.mozilla.org/en-US/docs/Web/API/Notification/requestPermission_static e https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification .

Validação: `node validar.cjs` cobre datas inválidas/passadas, substituição, persistência, conclusão/remoção, permissão somente por clique, recusa, processamento único, ICS com acentos/escape/dobra de linhas, interface simulada e destino interno ao clicar na notificação. Sintaxe e build Worker verificados. Pendentes: notificação real em Android/iOS/desktop, calendário real, leitor de tela e inspeção visual; preview deste checkout Worker continua sem servidor de desenvolvimento configurado. Não declarar entrega garantida com o site fechado.

### Sobre e fontes / compartilhamento (etapa 11)

Página estática `public/sobre.html`, acessível pelo rodapé, com proposta do Ecoa, distinção entre meta oficial/exemplo didático/ação do projeto, metodologia dos filtros e quiz, limites de calculadora/mapa/lembretes e explicação do armazenamento local e consultas externas. Reúne links para os 17 ODS, Agenda 2030, indicadores, Faça a sua parte, Histórias e referências técnicas. A leitura completa funciona sem JavaScript; tema e preferências reutilizam os controles existentes. Nenhuma alteração no catálogo ou nos dados salvos.

Página inicial e Sobre têm canonical e `og:url` específicos, título/descrição, imagem PNG existente do logo (512×512), dimensões, texto alternativo e Twitter Card summary. Não foi adicionada biblioteca nem alterada a URL/repositório. Links de ações usam fragmentos: sua prévia usa os metadados gerais da página inicial, pois robôs não executam a seleção da ação. A hospedagem mantém o acesso atual; restrições de acesso e cache dos aplicativos podem impedir ou atrasar prévias. Não há garantia de exibição por WhatsApp/redes sociais.

Cache PWA v18 inclui Sobre, inclusive navegação offline com parâmetros na URL. Testes verificam metadados únicos, canonical, dimensões declaradas, 17 links oficiais, âncoras, IDs e presença dos controles de leitura, além das regressões anteriores. Build Worker e sintaxe verificados. Conferência visual no celular, leitor de tela e prévia real em redes sociais continuam pendentes. Fontes institucionais principais consultadas em 11/11/2026.

## Redesign — Fase 1: navegação e design system

A navegação principal agora mostra uma tela por vez, mantendo os elementos existentes no DOM (formulários, resultados, seleções e eventos não são recriados):

| Rota | Conteúdo reaproveitado |
| --- | --- |
| `#/inicio` | Apresentação atual do Ecoa |
| `#/agir` | Busca, resultado, atalhos/assuntos, salvar, compartilhar e conteúdos da ONU |
| `#/agir/calcular` | Segunda aba de Agir: seis opções de cálculo e links para ações |
| `#/aprender` | Quiz e guias dos 17 ODS |
| `#/aprender/ods-6` | Guia selecionado, Voltar e ODS anterior/próximo (1 a 17, circular) |
| `#/na-cidade` | Mapa, lista, cadastro, filtros, sugestões de endereço/CEP e cópias dos pontos |
| `#/meu-espaco` | Plano, progresso/conquistas, lembretes, PDF, cópias e desafio |
| `#/meu-espaco/desafio` | Acesso direto ao desafio existente |
| `#/meu-espaco/conquistas` | Acesso direto aos selos existentes |
| `#/meu-espaco/configuracoes` | Acesso às preferências de leitura existentes |

O roteador `public/rotas.js` mantém Voltar/Avançar do navegador, título, foco e links antigos (`#busca`, `#buscar`, `#explorar`, `#guias`, `#quiz`, `#desafio`, `#meu-plano`, `#estimativa`, `#na-minha-cidade`). Links antigos `#acao=...` continuam funcionando; novos compartilhamentos usam `#/agir?acao=...`. Rotas desconhecidas voltam ao Início. As abas Buscar/Calcular aceitam setas, Home e End. O mapa recalcula suas dimensões ao retornar à tela. Menu superior no desktop e barra inferior no celular compartilham os mesmos cinco links, com ícones SVG, `aria-current`, safe-area e badge preparado (oculto até a fase 6).

`public/design-system.css` concentra tokens de cores claras/escuras, feedback, âmbar, estados desativados, sobreposição, tipografia, espaçamento, raios e sombras. Os nomes CSS antigos apontam para esses tokens para preservar os componentes. Títulos usam Georgia e corpo usa fontes do sistema; sem CDN/fonte nova. Números usam `lining-nums`; estatísticas também usam `tabular-nums`. Cores oficiais dos ODS não foram alteradas. Componentes incluem botões, chips, abas, cartões, avisos, estados vazios e estilos de modal.

**Dados preservados:** `oqdpf-plano-v1`, `oqdpf-acessibilidade-v1`, `ecoa-desafio-v1`, `ecoa-pontos-v1` e `ecoa-lembretes-v1` continuam iguais. O roteador não acessa localStorage. Formato de backup legado `oqdpf`, versão 1, mantido; sem migração. Cache PWA incrementado para **v19**, incluindo roteador e design system. Feche todas as abas do Ecoa e reabra para ativar uma atualização que esteja aguardando.

Testes: `node validar.cjs` cobre as regressões anteriores, rotas/aliases, cinco telas, abas/teclado, foco/títulos, histórico, 17 guias, compartilhamento legado/novo, manutenção dos nós e desafio previamente salvo sem regravação. Plano e pontos previamente salvos continuam cobertos pelos testes de carregamento. Backup inválido e estados vazios permanecem testados. Correção pontual de plural: “Sequência atual: 1 dia”.

Contraste WCAG calculado dos valores efetivos dos tokens: mínimo **4,98:1** nas combinações de texto testadas; controles/foco **>=3:1**. Feedback claro: sucesso 6,83, erro 7,34, aviso 7,26, informação 7,65, âmbar 6,04; escuro: 8,25 / 8,28 / 9,36 / 8,48 / 9,36. Estados desativados também >=4,5:1. Isso não certifica toda a página renderizada.

Limites de validação: prévia gerenciada indisponível porque o Worker não tem `scripts.dev` nem `static.directory`; não foi substituída a infraestrutura de preview. Inspeção real em 360 px, leitor de tela, instalação/atualização em dispositivo, APIs externas e Lighthouse continuam pendentes. Meta Lighthouse 90+, sem nota medida. Conteúdo/editorial, unificação de atalhos, abas de Meu espaço e reorganização de backups permanecem nas próximas fases aprovadas; esta fase estabelece a base sem removê-los.

## Redesign — Fase 2: Início

A tela inicial apresenta o título “Pequenas ações, 17 objetivos.”, a pergunta central e o botão “Encontrar uma ação”. Três cartões inteiramente clicáveis abrem Agir, Aprender e o Desafio de 7 dias. As ondas da marca são decorativas e estáticas nesta fase; animações ficam para a fase 7.

O resumo só aparece quando existem ações no Meu plano: concluídas, pendentes, ODS com conclusão, barra de progresso com rótulo acessível e link para continuar. `inicio.js` reutiliza `calcularProgressoPlano`; não acessa localStorage diretamente, não cria chaves e não grava dados. O resumo acompanha salvar, concluir, remover, restaurar cópia, atualizações do plano por outra aba e retorno ao Início. ODS do resumo contam objetivos com ações concluídas, não simplesmente selecionados.

`inicio.css` usa os tokens existentes, grade auto-fit/minmax, largura limitada pelo conteúdo disponível, tamanhos de texto/padding fluidos e nenhuma altura fixa de conteúdo. Cartões se reorganizam em celulares/tablets/desktops, botões ocupam a largura disponível em telas pequenas e as ondas não aumentam a largura rolável. Os links continuam acessíveis por teclado; layout mantém a barra inferior e sua safe-area. Sem imagens externas, fontes remotas ou bibliotecas novas. Cache PWA **v20** inclui os dois novos arquivos.

Validação: `node validar.cjs` passou, incluindo testes de resumo vazio, singular/plural, links, conclusão total/parcial, leitura do plano legado sem gravação e integração com os eventos reais dos módulos em DOM simulado. Sintaxe e build Worker verificados. Mantida a limitação de preview Worker documentada na fase 1: responsividade foi implementada no CSS, mas ainda não foi inspecionada em navegador real nas larguras 320/360/390/768/1024/1440 px nem com zoom/fonte ampliada. Lighthouse, leitor de tela e atualização do PWA em aparelho real permanecem pendentes. Não declarar essas inspeções como realizadas.


## Protótipo interativo — revisão de 12/11/2026

Mantidas as cinco áreas, o catálogo, os cálculos educativos, as chaves legadas e a hospedagem com acesso restrito. Agir inicia em Buscar e oferece a aba Calcular impacto com teclado (setas, Home e End). Guias completos aparecem nas rotas `#/aprender/ods-N`, com Voltar, ODS anterior e Próximo ODS. Rotas desconhecidas levam ao Início; âncoras antigas e ações compartilhadas são normalizadas pelo roteador.

O indicador âmbar em Meu espaço agora acompanha ações pendentes e o desafio disponível na data atual; desaparece ao concluir as pendências. O rótulo acessível informa o motivo e a mesma navegação funciona como menu no desktop e barra inferior no celular. `atividades.js` só deriva estado: não grava nem migra dados. O plano mostra suas ações antes das estatísticas e oferece atalhos para desafio, conquistas e preferências.

Os estados de informação, aviso, erro e resultado usam os tokens dos dois temas; o acento âmbar também identifica conquistas, e os estados desativados e sobreposição permanecem definidos. Números herdam `lining-nums`. O controle de tema anuncia a próxima opção disponível. Cache PWA v22 inclui o módulo de atividades.

Verificações realizadas nesta revisão:

- `node validar.cjs`: catálogo, filtros, cálculos, contraste, 17 guias, rotas, links legados/novos, persistência, compartilhamento, desafio, indicador e demais regressões aprovados. Contraste dos pares de tokens de texto: mínimo 4,98:1; bordas/foco: pelo menos 3:1.
- Chrome na prévia gerenciada: Início, Buscar, Calcular, ODS 6, Na cidade e Meu espaço em viewports de iframe de 320, 375, 768, 1024 e 1440 px. Nenhuma largura de documento excedeu a viewport. Conferidos tema claro com fonte padrão e escuro com fonte de 150%, além de inspeção visual.
- Fluxos reais no navegador: buscar ação gratuita, salvar e concluir no plano, indicador aparecer/desaparecer, iniciar e concluir o dia do desafio, cálculo de 1 torneira por 7 dias = cenário de até 322 L, alternar abas por seta, ODS 6 → 7 → Voltar, `#estimativa`, ação antiga `#acao=…` e rota desconhecida. Dados reapareceram após reabrir a prévia.
- A prévia usou temporariamente os arquivos estáticos para verificar a interface; o manifesto final preserva o Worker e sua API da ONU. O arquivo auxiliar de viewports foi removido antes do pacote. Assim, esta revisão supera a limitação de inspeção visual descrita nas fases anteriores.

Limites: os viewports são simulações de layout no Chrome, não testes em aparelhos físicos. Não foram medidos Lighthouse nem testes com leitor de tela. Mapas, consultas de endereços e conteúdo externo continuam dependentes dos serviços descritos na página Sobre; esta revisão não comprova sua disponibilidade em tempo real. A verificação de contraste dos tokens não equivale a uma auditoria WCAG completa.

## Redesign — Fase 3: Agir

- Busca e calculadora permanecem em abas separadas. Atalhos de tempo, gratuidade, local e assuntos agora ficam em um único lugar e preservam os demais filtros.
- Objetivos específicos ficam em seção expansível; links antigos abrem a seção antes de rolar. Resultado reúne salvar, outra sugestão e compartilhar, com conteúdos da ONU recolhidos no próprio cartão.
- Calculadora mantém os seis modelos e fontes; hipóteses e referências podem ser expandidas. Estado vazio permite limpar e buscar novamente.
- Layout usa grade flexível, controles com pelo menos 48px e empilhamento em telas estreitas. Nenhuma chave ou formato de armazenamento foi alterado. Cache offline v23 inclui agir.js e agir.css.
- Validação: node validar.cjs e build Worker. Testes novos cobrem filtros combinados, alternância, horas/minutos, edição manual, isolamento do tema, validação e recuperação vazia.
- Limite: a prévia gerenciada exibiu a versão anterior mesmo após reinício; não foi possível confirmar visualmente esta fase em dispositivos diferentes. Lighthouse e APIs externas ao vivo não medidos nesta fase.

## Redesign — Fase 4: Aprender

- Busca local por nome, palavras ou número exato do ODS, sem diferenciar acentos e caixa; contagem acessível, estado vazio e limpeza com retorno do foco.
- Cartões maiores com links próprios, abertura por teclado e possibilidade de abrir em outra aba; filtros preservados ao voltar. Guias mantêm história, metas, exemplo didático, prática e links oficiais. Metas resumidas e ações do projeto têm rótulos distintos.
- Quiz em destaque, metodologia recolhível e resultado ligado aos guias e ações. Nenhuma alteração nas chaves ou dados de armazenamento. Cache offline v24 inclui aprender.js e aprender.css.
- Testes: node validar.cjs (incluindo busca, acentos, números, estados vazios, limpeza, foco e regressões de roteamento/quiz/persistência), sintaxe e build Worker.
- Chrome na prévia: busca AGUA, abertura do ODS 6 por Enter e foco no título; larguras de iframe 320, 360, 768 e 1024px sem overflow horizontal; guia ODS 6 também sem overflow em 320px. Verificação visual em tema escuro.
- Não verificado nesta fase: Lighthouse, leitor de tela real, aparelhos físicos e revisão visual completa no tema claro. Fontes e textos oficiais existentes foram preservados, sem nova verificação externa.

## Redesign — Fase 5: Na cidade

Mapa em destaque (mínimo de 24rem no celular), busca de endereço/CEP preservada, cadastro em painel expansível com foco e botão para fechar. Lista separada com filtro por cidade/categoria, contagem singular/plural e estados vazios com ação de cadastrar ou limpar filtros. Cópias dos pontos continuam compatíveis, com rótulos simples; a centralização em Configurações fica para a Fase 6. Serviços técnicos e privacidade detalhados permanecem em Sobre e fontes; atribuição obrigatória do mapa foi mantida.

Nenhuma chave de armazenamento ou formato de arquivo foi alterado. Cache offline v25 inclui cidade-layout.css. Nenhuma biblioteca adicionada.

Validação: node validar.cjs, sintaxe, build Worker e diff sem erros. Novas verificações de painel, foco, contagem, estados vazios e limpar filtros, além das regressões de persistência/importação/mapa/endereço. Chrome: abertura do cadastro com foco, mapa externo abriu, larguras de iframe 320/360/768/1024px sem overflow com cadastro aberto; tema claro inspecionado. Não verificados: Lighthouse, aparelhos físicos, leitor de tela real, tema escuro visualmente e novas consultas ao vivo de autocomplete/CEP (cobertas por API simulada).

## Pontos automáticos — Na cidade

`pontos-osm.js` isola consultas e provedores; `pontos-osm-ui.js` integra mapa/lista sem alterar `ecoa-pontos-v1` ou o formato de Meus lugares. Nenhuma biblioteca nova. Uma categoria precisa ser escolhida; movimento consulta após 600 ms, zoom mínimo 13 e área com amplitude até 0,3° por eixo. A bbox é expandida para uma grade de 0,01° para reuso; resultados são filtrados à área efetivamente visível. Limite 200, sem paginação. Nós e centros de vias/relações representam os locais; centros podem ficar fora da área e são omitidos.

| Categoria | Tags OSM |
|---|---|
| Reciclagem | amenity=recycling |
| Doação | shop=charity |
| Água potável | amenity=drinking_water |
| Hortas e áreas verdes | leisure=garden, leisure=park, landuse=allotments |
| Outros | amenity=public_bookcase, amenity=community_centre |

Tags conferidas na [documentação OSM](https://wiki.openstreetmap.org/wiki/Map_features). Doação representa lojas beneficentes, não garantia de recebimento. Jardins/hortas podem ser privados; confirmar acesso. Outros reúne bibliotecas de rua e centros comunitários, não certifica serviços sociais. Informações OSM não são fontes de fatos sobre ODS; as fontes oficiais dos guias permanecem intactas.

Provedores: overpass-api.de e overpass.private.coffee, com fallback. AbortController cancela requisições anteriores e timeout de 30 s; resultados atrasados são descartados. 429/504 respeitam Retry-After (segundos ou data) e backoff mínimo 30 s, exponencial até 240 s. Erros de rede aguardam 1,5 s antes do mirror. Não contornar limites consultando mirrors imediatamente. Cache de até 20 áreas/categorias por 15 min em memória e sessionStorage (`ecoa-osm-cache-v1`), independente do localStorage. Comentário da consulta identifica Ecoa; navegador controla User-Agent. Referência: [uso da Overpass](https://wiki.openstreetmap.org/wiki/Overpass_API). Serviços públicos não garantem disponibilidade.

### Adicionar pontos curados

Edite `public/pontos-fixos.json`: os dois registros são **EXEMPLOS FICTÍCIOS**, com `exemplo: true`, e ficam excluídos dos resultados. Substitua por dados que você conferiu e só então remova a flag ou use `false`. Não publique coordenadas/endereço de exemplo como se reais fossem.

Campos: `id` único; `nome`; `categoria` (`reciclagem`, `doacao`, `agua`, `verde`, `outros`); `endereco`; `cidade`; `UF`; `latitude` e `longitude` numéricas; `horario`; `aceita`; `telefone`; `fonte` HTTPS; `dataVerificacao` em AAAA-MM-DD válida, sem data futura. Endereço/horário/o que aceita também aceitam as chaves acentuadas `endereço`, `horário`, `o que aceita`. Confirme nome, condições, fonte e posição. Não inclua telefones ou endereços pessoais privados. A interface mostra “Verificado em dd/mm/aaaa”; não existe verificação automática. Dados inválidos são omitidos.

Fixos têm prioridade na mesclagem: mesmo identificador ou nome semelhante (acentos/caixa ignorados, ao menos 80% dos termos iguais) a menos de 30 m evita duplicação. Sem nome no OSM, só o identificador deduplica. Meus lugares fica separado e não é mesclado/apagado. Não há pontos curados reais inicialmente: offline pode mostrar lista vazia até você adicionar os seus.

### Sugestões e correções

Configure `CONTATO_PONTOS_EMAIL` e/ou `CONTATO_PONTOS_WHATSAPP` no topo de `public/pontos-osm-ui.js`. WhatsApp: só dígitos, país+DDD+número. Enquanto vazios, enviar fica indisponível, com aviso claro e opção de copiar. Formulário prepara links mailto/WhatsApp; usuário revisa e confirma no aplicativo. Nenhum backend ou envio automático. Correções preenchem referência do local no mesmo formulário.

### Privacidade, offline e testes

“Perto de mim” solicita localização somente após clique e não persiste as coordenadas recebidas. A área arredondada de consultas entra no cache de sessão. Offline a lista pública exibe só fixos disponíveis no cache PWA; Meus lugares continua acessível. Tiles, geocodificação e Overpass exigem internet. Cache PWA v27 inclui arquivos novos e pontos-fixos.json, nunca respostas Overpass. Atribuição © OpenStreetMap contributors e [licença ODbL](https://www.openstreetmap.org/copyright) no mapa, na lista e em Sobre.

`node validar.cjs` testa consultas, zoom, debounce, cancelamento, respostas tardias/vazias, cache/TTL/sessão, 429/504/mirrors, mesclagem, datas e exemplos, UI offline, localização opt-in e contatos, além das regressões do projeto. Resultados de serviços ao vivo variam; ausência de pontos não significa ausência de iniciativas.

Verificação desta entrega: `node validar.cjs` e build Worker; Chrome com viewports de iframe 320/360/768/1024 px sem overflow horizontal, tema escuro, seleção por teclado e formulário sem envio. Busca de endereço real localizou Parque Ibirapuera; Overpass esgotou o tempo de resposta e exibiu recuperação. Não foi confirmado carregamento de pontos reais nesta sessão. Leitor de tela, aparelho físico, permissão GPS real e envio ao contato não foram testados. O contato permanece vazio até o responsável configurá-lo. A Fase 6 de Meu espaço não integra esta entrega do mapa.

## Refinamento UX/UI — Fase A

Rótulos e mensagens usam “cópia do plano/pontos”, preservando nomes de arquivos, formatos, IDs e chaves de armazenamento. Erros de leitura de lembretes e pontos recebidos não expõem erros técnicos de parsing. Lembretes têm opção-guia e instrução persistente para data/hora; sem ação pendente, ambos os campos e Salvar ficam desativados com explicação associada via ARIA. Voltam a funcionar quando há pendências. PDF explica plano vazio e preparação em andamento. Campos de texto, data, arquivo, seleção e área de texto compartilham tokens de borda, raio, cor e estado desativado; checkboxes/ODS preservados.

“Adicionar um ponto” é o único botão para abrir o cadastro local, com foco no primeiro campo; Fechar retorna foco ao botão. O vazio orienta a usar esse botão; limpar filtros só aparece quando há lugares salvos. Sugerir um ponto continua separado por ter finalidade diferente (contato externo, sem salvar localmente). Cache PWA v28.

Validação: node validar.cjs, sintaxe e build Worker; testes de textos sem jargão, motivos do PDF, entrada única do cadastro, lembretes sem/com pendências, falha de armazenamento e regressões de cópias/pontos. Chrome: campos bloqueados sem pendências, texto-guia, PDF com plano existente, abertura do cadastro/foco e campos arredondados no tema escuro. Plano concluído e desafio anteriores continuaram visíveis sem limpar o armazenamento. Não repetidos nesta fase: aparelhos físicos, leitor de tela, auditoria Lighthouse ou serviços externos ao vivo. Fases B–D não implementadas nesta entrega.


## Refinamento UX — Fase B

Meu espaço usa abas com rotas próprias para plano, desafio, conquistas e configurações. Setas, Home e End navegam pelas abas. Os componentes originais são preservados, sem mudar chaves ou conteúdo do localStorage.

Aprender mostra quiz compacto antes dos 17 guias; limpar busca aparece somente com texto. Na cidade carrega o mapa ao entrar na tela, com nova tentativa em caso de falha; localização continua opcional e pontos públicos só são consultados após escolher categoria. O cabeçalho contém Aa para leitura, com fechamento por Escape e clique fora. Agir possui botão fixo ligado ao formulário existente, acima da navegação inferior.

Validação: `node validar.cjs` cobre abas exclusivas, rotas, teclado, aliases de backup, limpeza condicional, carregamento do mapa por rota e controles de leitura, além das regressões existentes. Na prévia foram conferidos plano e desafio previamente salvos, busca fixa, mapa automático e larguras de 320, 360, 768 e 1024 px. Não foram realizados Lighthouse, teste em aparelho físico ou nova instalação offline nesta fase.


## Refinamento UX — Fase C

Cartões do Início compactos com toda a área clicável; estatísticas em três colunas; conquistas com cadeado/check em SVG, progresso nativo acessível e acento âmbar dos tokens existentes. Ícones oficiais já presentes no projeto identificam os ODS no gráfico. Explicações de lembretes, desafio e conquistas ficam em detalhes recolhíveis; tema com ícone e nome acessível. Sem novas dependências ou mudanças no localStorage. Cache incrementado para v32.

Testes: `node validar.cjs` inclui progresso vazio, parcial, completo e recalculado, rótulos das barras, ícones e singular. Verificação no navegador em 320, 360, 768 px e desktop, temas claro/escuro, cartão clicável e detalhes por teclado. Não executados Lighthouse, leitor de tela real, aparelho físico ou reinstalação offline.


## Refinamento UX — Fase D

Ação do dia derivada da data local e da ordem do catálogo; estável durante o dia, atualizada ao voltar ao Início ou à aba. Abre o passo a passo pela rota de compartilhamento existente. O resumo do plano é apresentado como Continuar de onde parei. O plano vazio tem um convite único para encontrar uma ação, preservando PDF e lembretes com suas mensagens.

O desafio ganhou 17 botões com ícones oficiais, nomes acessíveis, foco e estado selecionado; o seletor original continua sendo a fonte da escolha e o desafio salvo não muda até a confirmação existente. Instalar o Ecoa fica em Meu espaço > Configurações: solicitação nativa somente após clique, instruções alternativas quando indisponível e ocultação quando aberto como aplicativo. Sem novas dependências ou chaves de armazenamento. Cache v35 inclui a integração com a função da Vercel.

Validação: node validar.cjs cobre data local, troca de dia, links, seleção dos 17 ODS, instalação somente por clique, recusa, erro, modo aplicativo e plano vazio/preenchido. No navegador foram conferidos a ação do dia, o plano existente e a seleção pelo teclado. Instalação real em Android/iOS, Lighthouse e uso em aparelho físico não foram verificados.

