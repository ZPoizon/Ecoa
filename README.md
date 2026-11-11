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
