# Ecoa

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
