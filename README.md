# Ecoa

**Pequenas ações, 17 objetivos.**

O Ecoa é um site educativo que ajuda qualquer pessoa a transformar os **17 Objetivos de Desenvolvimento Sustentável (ODS)** em ações práticas, em casa ou na cidade. A proposta é responder, de forma simples:

> Com o tempo e o dinheiro que tenho hoje, o que posso fazer?

Além de explicar os ODS, o site sugere o que fazer, orienta como começar e permite acompanhar as ações escolhidas. É um projeto acadêmico de **Análise e Desenvolvimento de Sistemas**, independente e **não oficial da ONU**.

## O que você encontra

- **Agir:** sugestões com filtros de tempo, orçamento, local e ODS, instruções práticas, compartilhamento e calculadora de estimativas de impacto.
- **Aprender:** guias dos 17 ODS, referências oficiais e quiz para descobrir objetivos ligados aos seus interesses.
- **Na cidade:** consulta de locais de reciclagem, doação, água potável, áreas verdes e outros pontos úteis, com busca por cidade, endereço, CEP ou nome, filtros, detalhes e acesso à rota.
- **Meu espaço:** plano pessoal, ações concluídas, desafio de 7 dias, conquistas, lembretes, exportação em PDF e cópia de segurança.
- **No dia a dia:** ação do dia, tema claro/escuro, preferências de leitura, interface responsiva e instalação como aplicativo (PWA).

O plano e as preferências ficam no navegador, sem sincronização automática entre aparelhos. O PWA permite acessar recursos locais após a primeira visita; mapas, novas consultas e conteúdos externos dependem de conexão. A cobertura dos pontos varia conforme os dados disponíveis em cada região.

## Tecnologias utilizadas

| Tecnologia | Uso no projeto |
| --- | --- |
| **HTML5, CSS3 e JavaScript puro** | Interface, responsividade e funcionalidades, sem framework de front-end |
| **PWA, Service Worker e Web App Manifest** | Instalação e cache de arquivos para uso offline |
| **localStorage e JSON** | Plano pessoal, preferências, cópias de segurança e bases de dados locais |
| **Leaflet e OpenStreetMap** | Exibição do mapa e dados geográficos |
| **Overpass API, Photon e ViaCEP** | Consulta de pontos, sugestões de endereço e busca por CEP |
| **Supabase / PostgreSQL com RLS** | Consulta de pontos compartilhados e controle de acesso aos dados |
| **pdf-lib** | Geração do PDF do plano |
| **Node.js 22** | Servidor de desenvolvimento, build, scripts e testes automatizados |
| **Vercel e Vercel Functions** | Hospedagem do site e consulta complementar de conteúdos da ONU Brasil |
| **Git e GitHub** | Versionamento do código |

## Executar localmente

Requer **Node.js 22**. O projeto não exige instalação de pacotes npm para os comandos abaixo.

```powershell
git clone https://github.com/ZPoizon/Ecoa.git
cd Ecoa
npm run dev
```

Abra [localhost:4173](http://localhost:4173). Para testar e conferir a versão de produção:

```powershell
npm test
npm run build
npm run preview
```

A integração com o Supabase é configurada em `public/config.js`; a estrutura e as políticas do banco estão em [supabase/schema.sql](supabase/schema.sql). Use apenas a chave pública no navegador, nunca a chave secreta.

## Estrutura e publicação

- **`public/`** — arquivos editáveis do site, imagens, bases locais e PWA.
- **`api/`** — função de consulta aos conteúdos da ONU.
- **`supabase/`** — estrutura do banco e testes de segurança.
- **`scripts/`** — servidor local e scripts de importação.
- **`validar.cjs` e `tests/`** — testes automatizados.
- **`dist/`** — saída gerada pelo build; não editar diretamente.

Na **Vercel**, importe o repositório com a raiz do projeto, preset **Other**, build `npm run build` e saída `dist`. A configuração está em [vercel.json](vercel.json).

## Fontes e documentação

As metas oficiais, os exemplos educativos e as ações sugeridas pelo Ecoa são identificados separadamente. Os pontos do mapa devem ter suas informações confirmadas antes de uma visita.

- [ODS — ONU Brasil](https://brasil.un.org/pt-br/sdgs)
- [Objetivos — Nações Unidas](https://sdgs.un.org/goals)
- [Créditos e licença dos dados do OpenStreetMap](https://www.openstreetmap.org/copyright)
- [Histórico técnico e instruções das etapas anteriores](docs/HISTORICO-TECNICO.md)
