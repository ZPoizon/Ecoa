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
- **Worker** — suporte à consulta de conteúdos externos;
- **Git e GitHub** — versionamento e colaboração.

> Outras tecnologias e recursos, como PWA, gráficos, mapas e quiz, podem ser documentados aqui após a confirmação de sua implementação na versão atual do repositório.

## 📁 Estrutura do projeto

Conforme a organização inicialmente descrita:

```text
.
├── dist/
│   ├── index.html    # Estrutura principal da interface
│   ├── style.css     # Estilos e responsividade
│   ├── acoes.js      # Catálogo de ações e filtros
│   ├── app.js        # Interface, busca e dados dos ODS
│   ├── guias.js      # Guias educativos dos 17 ODS
│   ├── plano.js      # Atalhos e plano pessoal
│   └── onu.js        # Integração com conteúdos da ONU Brasil
├── worker/           # Serviço de consulta externa
└── validar.cjs       # Testes automatizados
```

A estrutura pode variar conforme a evolução do repositório.

## 🚀 Como executar

1. Clone o repositório e abra a pasta do projeto no editor de sua preferência.
2. Para testar a interface, sirva a pasta `dist/` utilizando um servidor HTTP local, como a extensão **Live Server** do VS Code.
3. Acesse o endereço local exibido pelo servidor no navegador.

> A consulta automática a conteúdos externos pode depender da configuração e execução do Worker. A interface e o catálogo de ações são independentes dessa consulta.

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

Guia de ações práticas da Agenda 2030. Abra dist/index.html diretamente no navegador. Para hospedar no GitHub Pages, publique o conteúdo de dist como raiz do site. Para validar os filtros, rode `node validar.cjs` na raiz do projeto.

## Estrutura
- dist/index.html — interface e formulário
- dist/style.css — layout responsivo
- dist/acoes.js — dados e regras de filtragem
- dist/app.js — interação e atualização da página
- validar.cjs — testes automatizados do catálogo e da filtragem
- BACKLOG.md — tarefas, critérios, histórico e registro de equipe

## Demonstração
Escolha até 15 min, sem gastar e na rua. Avance entre as duas ações. Troque para até 5 min para demonstrar o estado vazio. Limpe e clique no ODS 17 para demonstrar a navegação pelo catálogo.

## Histórico Git
Execute `git log --oneline --decorate` e `git tag -n`. O ZIP contém um arquivo projeto.bundle para restaurar a branch e as tags com `git clone -b entrega projeto.bundle projeto-com-historico`.

### Instalação e uso offline

Abra o site em HTTPS. No Android, procure **Instalar app** ou **Adicionar à tela inicial** no menu do navegador. No iPhone, abra no Safari e use **Compartilhar → Adicionar à Tela de Início**.

A primeira visita precisa de internet para armazenar os arquivos. Depois, a busca, os guias, o plano salvo e a exportação em PDF usam os arquivos locais. As consultas à ONU e a abertura de links externos exigem conexão.

Ao atualizar arquivos incluídos no cache, incremente a versão em `dist/sw.js`. A nova versão entra em uso quando as abas da versão anterior forem fechadas.

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

**Pequenas ações, 17 objetivos.** Pergunta central: “Com o tempo e o dinheiro que tenho hoje, o que posso fazer?”. Projeto independente e educativo, não oficial da ONU. O SVG em `dist/icons/ecoa.svg` é a origem dos ícones PNG (192, 512 e maskable), com três círculos concêntricos e um ponto central; o desenho fica dentro da área segura circular de 80% do maskable. O PDF reproduz o símbolo em vetores.

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

Arquivo `dist/pontos-modelo.json`: `{"versao":1,"pontos":[]}`. Cada item de `pontos` deve conter:

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

`dist/enderecos.js` conecta automaticamente inputs com `data-autocomplete-endereco`, inclusive inseridos depois no DOM. O atributo opcional `data-endereco-formato="cidade"` preenche cidade/UF; demais campos recebem o endereço. O evento `endereco-selecionado` fornece `detail` com rótulo, bairro, cidade, UF, latitude e longitude. `window.Enderecos.buscar(input)` executa a busca explícita e seleciona o primeiro resultado (formulário do mapa, inclusive Enter sem opção ativa).

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
