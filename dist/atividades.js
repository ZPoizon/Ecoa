// Indicador derivado dos dados existentes. Não cria chaves nem altera o progresso.
function resumirAtividadesEcoa(pendentes, desafio, hoje,
  calcularEstado = typeof module !== 'undefined' ? require('./desafio').estadoDesafio : estadoDesafio) {
  let desafioPendente = false;
  if (desafio) {
    try {
      const estado = calcularEstado(desafio, hoje);
      desafioPendente = estado.dia >= 0 && estado.dia < 7 && !desafio.dias[estado.dia];
    } catch { /* Um desafio inválido não impede a navegação. */ }
  }
  const partes = [];
  if (pendentes > 0) partes.push(`${pendentes} ${pendentes === 1 ? 'ação pendente' : 'ações pendentes'}`);
  if (desafioPendente) partes.push('desafio de hoje disponível');
  return {visivel: partes.length > 0, texto: partes.join(' e ')};
}

function iniciarAtividadesEcoa(doc, obterEstado) {
  function atualizar() {
    const {pendentes, desafio, hoje} = obterEstado();
    const estado = resumirAtividadesEcoa(pendentes, desafio, hoje);
    doc.querySelectorAll('[data-nav-badge]').forEach(badge => {
      badge.hidden = !estado.visivel;
      badge.querySelector('.sr-only').textContent = estado.visivel ? ' — ' + estado.texto : '';
      badge.parentElement.title = estado.visivel ? 'Meu espaço: ' + estado.texto : 'Meu espaço';
    });
    return estado;
  }
  atualizar();
  return {atualizar};
}

if (typeof module !== 'undefined') module.exports = {resumirAtividadesEcoa, iniciarAtividadesEcoa};
else {
  window.ecoaAtividades = iniciarAtividadesEcoa(document, () => ({
    pendentes: calcularProgressoPlano(plano, acoes).pendentes,
    desafio: desafioAtual,
    hoje: dataLocalDesafio()
  }));
  const observar = new MutationObserver(() => window.ecoaAtividades.atualizar());
  ['progresso-pendentes', 'desafio-resumo'].forEach(id =>
    observar.observe(document.getElementById(id), {childList: true, characterData: true, subtree: true}));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) window.ecoaAtividades.atualizar();
  });
}
