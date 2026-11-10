const botaoCompartilhar = document.querySelector('#compartilhar-acao');
const botaoCopiar = document.querySelector('#copiar-acao');
const whatsappAcao = document.querySelector('#whatsapp-acao');
const avisoCompartilhar = document.querySelector('#compartilhar-status');
const copiaManual = document.querySelector('#copia-manual');
const textoManual = document.querySelector('#texto-compartilhar');
let compartilhamentoAtual;
let compartilhamentoPendente = false;

function atualizarCompartilhamento() {
  const acao = encontradas[indice];
  compartilhamentoAtual = acao && !resultado.hidden ? dadosCompartilhamento(acao, location.href) : undefined;
  avisoCompartilhar.textContent = '';
  copiaManual.hidden = true;
  textoManual.value = '';
  if (compartilhamentoAtual) whatsappAcao.href = linkWhatsApp(compartilhamentoAtual);
  else whatsappAcao.removeAttribute('href');
}

async function executarCompartilhamento(copiar = false) {
  if (!compartilhamentoAtual || compartilhamentoPendente) return;
  const dados = compartilhamentoAtual;
  compartilhamentoPendente = true;
  botaoCompartilhar.disabled = botaoCopiar.disabled = true;
  try {
    const estado = await (copiar ? copiarCompartilhamento : compartilharAcao)(dados, navigator);
    // Não exibir o texto de uma ação antiga se a pessoa mudou o resultado.
    if (dados !== compartilhamentoAtual) return;
    avisoCompartilhar.textContent = {
      compartilhado: 'Compartilhamento concluído pelo navegador.',
      cancelado: 'Compartilhamento cancelado.',
      copiado: 'Ação e link copiados. Cole onde quiser compartilhar.',
      manual: 'A cópia automática não está disponível. Copie o texto abaixo ou use o WhatsApp.'
    }[estado];
    copiaManual.hidden = estado !== 'manual';
    if (estado === 'manual') {
      textoManual.value = textoCompartilhamento(dados);
      textoManual.focus();
      textoManual.select();
    }
  } finally {
    compartilhamentoPendente = false;
    botaoCompartilhar.disabled = botaoCopiar.disabled = false;
  }
}

function abrirAcaoCompartilhada() {
  if (!location.hash.startsWith('#acao=')) return;
  const acao = acaoDoLink(location.hash, acoes);
  if (!acao) {
    status.textContent = 'Esta ação não foi encontrada. Use a busca para escolher outra sugestão.';
    status.tabIndex = -1;
    status.focus();
    return;
  }
  form.reset();
  encontradas = [acao];
  indice = 0;
  mostrar();
}

botaoCompartilhar.addEventListener('click', () => executarCompartilhamento());
botaoCopiar.addEventListener('click', () => executarCompartilhamento(true));
document.addEventListener('tema-ods', atualizarCompartilhamento);
window.addEventListener('hashchange', abrirAcaoCompartilhada);
atualizarCompartilhamento();
abrirAcaoCompartilhada();
