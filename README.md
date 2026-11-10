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

### Backup do Meu plano em JSON (etapa 2)

Em **Meu plano → Guardar ou trazer um plano (JSON)**, baixe uma cópia ou importe um arquivo em outro aparelho. O PDF continua disponível para leitura e impressão. Não há envio do arquivo a um servidor nem sincronização automática entre aparelhos.

O JSON tem `projeto: "oqdpf"`, `versao: 1` e `acoes: [{ chave, concluida }]`. A chave segue o catálogo atual (`ODS:título`). O limite é 100 KB. Arquivos inválidos, versões incompatíveis, ações desconhecidas, duplicadas ou estados diferentes de booleanos são rejeitados por inteiro. Se os títulos do catálogo mudarem, será preciso prever migração de chaves antes de aceitar backups antigos.

A importação une os planos; mantém as ações existentes e considera concluída uma ação marcada como concluída em qualquer um dos dois. Um backup vazio não apaga nada. Uma falha ao persistir a importação mantém o estado anterior. O novo módulo também fica no cache offline (v2).

Teste automatizado: `node validar.cjs`. Teste manual: salve duas ações, conclua uma, exporte, abra em outro navegador e importe; confira os estados e o PDF. Repita com JSON inválido e com o mesmo arquivo; nenhuma ação deve ser perdida ou duplicada.
