// Chave legada preservada para manter os planos existentes, sem migração destrutiva.
const planoChave = 'oqdpf-plano-v1';
const planoLista = document.querySelector('#plano-lista');
const planoResumo = document.querySelector('#plano-resumo');
const planoAviso = document.querySelector('#plano-aviso');
const baixarPlano = document.querySelector('#baixar-plano');
const avisoExportacao = document.querySelector('#plano-exportacao');
let exportandoPlano = false;
const exportarJson = document.querySelector('#exportar-json');
const importarJson = document.querySelector('#importar-json');
const arquivoPlano = document.querySelector('#arquivo-plano');
const statusJson = document.querySelector('#plano-json-status');
const salvarAcao = document.querySelector('#salvar-acao');
const chaveAcao = acao => acao.ods + ':' + acao.titulo;
let plano = new Map();

try {
  const dados = JSON.parse(localStorage.getItem(planoChave) || '{}');
  plano = new Map(acoes.map(chaveAcao).filter(chave => typeof dados?.[chave] === 'boolean')
    .map(chave => [chave, dados[chave]]));
} catch {
  planoAviso.textContent = 'Não foi possível ler o plano salvo neste navegador.';
}

function atualizarBotaoSalvar() {
  const acao = encontradas[indice];
  const salva = acao && plano.has(chaveAcao(acao));
  salvarAcao.textContent = salva ? 'Ver no meu plano' : 'Salvar no meu plano';
}

function atualizarPlano() {
  if(typeof window!=='undefined')window.ecoaLembretes?.atualizar();
  atualizarProgressoPlano(plano);
  planoLista.replaceChildren();
  exportarJson.disabled = plano.size === 0;
  baixarPlano.disabled = exportandoPlano || plano.size === 0;
  const concluidas = [...plano.values()].filter(Boolean).length;
  planoResumo.textContent = plano.size
    ? `${concluidas} de ${plano.size} ações concluídas. Seu plano fica neste navegador.`
    : 'Salve uma sugestão para começar seu plano.';
  for (const acao of acoes) {
    const chave = chaveAcao(acao);
    if (!plano.has(chave)) continue;
    const linha = document.createElement('li');
    const rotulo = document.createElement('label');
    const concluida = document.createElement('input');
    concluida.type = 'checkbox';
    concluida.checked = plano.get(chave);
    concluida.setAttribute('aria-label', 'Concluir: ' + acao.titulo);
    concluida.addEventListener('change', () => {
      plano.set(chave, concluida.checked);
      guardarPlano();
      atualizarProgressoPlano(plano);
      planoResumo.textContent = `${[...plano.values()].filter(Boolean).length} de ${plano.size} ações concluídas. Seu plano fica neste navegador.`;
    });
    rotulo.append(concluida, acao.titulo);
    const remover = document.createElement('button');
    remover.type = 'button';
    remover.className = 'secondary';
    remover.textContent = 'Remover';
    remover.setAttribute('aria-label', 'Remover: ' + acao.titulo);
    remover.addEventListener('click', () => {
      plano.delete(chave);
      guardarPlano();
      atualizarPlano();
      document.querySelector('#plano-titulo').focus();
    });
    linha.append(rotulo, remover);
    planoLista.append(linha);
  }
  atualizarBotaoSalvar();
}

function guardarPlano() {
  if(typeof window!=='undefined')window.ecoaLembretes?.atualizar();
  try {
    localStorage.setItem(planoChave, JSON.stringify(Object.fromEntries(plano)));
    planoAviso.textContent = '';
  } catch {
    planoAviso.textContent = 'O navegador não permitiu salvar. O plano está disponível nesta sessão.';
  }
}

salvarAcao.addEventListener('click', () => {
  const chave = chaveAcao(encontradas[indice]);
  if (plano.has(chave)) {
    if(typeof window!=='undefined')window.EcoaRouter?.navegar('#/meu-espaco');
    document.querySelector('#plano-titulo').focus();
    return;
  }
  plano.set(chave, false);
  guardarPlano();
  atualizarPlano();
});
document.addEventListener('tema-ods', atualizarBotaoSalvar);

document.querySelectorAll('#explorar button[data-rapida], #explorar button[data-tema]').forEach(botao => {
  botao.addEventListener('click', () => {
    form.reset();
    if (botao.dataset.rapida === 'tempo') form.elements.tempo.value = '5';
    if (botao.dataset.rapida === 'rua') form.elements.local.value = 'Na rua';
    if (botao.dataset.rapida === 'gratis') form.elements.custo.value = '0';
    if (botao.dataset.tema) {
      const temas = botao.dataset.tema.split(',');
      for (const campo of form.querySelectorAll('[name="ods"]')) campo.checked = temas.includes(campo.value);

    }
    buscar();
  });
});
atualizarPlano();

baixarPlano.addEventListener('click', async () => {
  const itens = acoes.filter(acao => plano.has(chaveAcao(acao)))
    .map(acao => ({ ...acao, concluida: plano.get(chaveAcao(acao)) }));
  if (!itens.length) return;
  exportandoPlano = true;
  baixarPlano.disabled = true;
  avisoExportacao.textContent = 'Preparando o PDF…';
  try {
    const biblioteca = await import('./vendor/pdf-lib.min.js');
    const bytes = await gerarPdfPlano(biblioteca, itens, new Date().toLocaleDateString('pt-BR'));
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ecoa-meu-plano.pdf';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    avisoExportacao.textContent = 'PDF pronto. Confira os downloads do navegador.';
  } catch {
    avisoExportacao.textContent = 'Não foi possível gerar o PDF. Tente novamente.';
  } finally {
    exportandoPlano = false;
    baixarPlano.disabled = plano.size === 0;
  }
});


exportarJson.addEventListener('click', () => {
  try {
    const texto = exportarPlanoJson(plano, acoes);
    const url = URL.createObjectURL(new Blob([texto], { type: 'application/json;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ecoa-meu-plano.json';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    statusJson.textContent = 'Cópia JSON pronta. Confira os downloads do navegador.';
  } catch {
    statusJson.textContent = 'Não foi possível baixar a cópia. Tente novamente.';
  }
});

importarJson.addEventListener('click', () => arquivoPlano.click());
arquivoPlano.addEventListener('change', async () => {
  const arquivo = arquivoPlano.files[0];
  if (!arquivo) return;
  importarJson.disabled = true;
  statusJson.textContent = 'Lendo e validando o arquivo…';
  try {
    const texto = await lerArquivoPlanoJson(arquivo);
    const resultado = importarPlanoJson(texto, acoes, plano, localStorage, planoChave);
    plano = resultado.plano;
    planoAviso.textContent = '';
    atualizarPlano();
    statusJson.textContent = resultado.quantidade
      ? `Importação concluída: ${resultado.quantidade} ações no arquivo, ${resultado.novas} novas no plano. As ações concluídas foram preservadas.`
      : 'O arquivo contém um plano vazio. Suas ações foram mantidas.';
  } catch (erro) {
    statusJson.textContent = erro instanceof Error ? erro.message : 'Não foi possível importar. Seu plano atual foi mantido.';
  } finally {
    arquivoPlano.value = '';
    importarJson.disabled = false;
    importarJson.focus();
  }
});

// Mantém o plano e os lembretes coerentes quando outra aba conclui/remove uma ação.
if(typeof window!=='undefined')window.addEventListener('storage',evento=>{
  if(evento.key!==planoChave)return;
  try{
    const dados=JSON.parse(evento.newValue||'{}');
    plano=new Map(acoes.map(chaveAcao).filter(chave=>typeof dados?.[chave]==='boolean').map(chave=>[chave,dados[chave]]));
    atualizarPlano();
  }catch{planoAviso.textContent='Não foi possível atualizar o plano de outra aba.';}
});
