# O Que Dá Pra Fazer?

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
