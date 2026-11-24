const chaveAcessibilidade = 'oqdpf-acessibilidade-v1';
// Alvos que devem manter :focus-visible mesmo quando o foco chega por clique.
// Qualquer outro elemento com tabindex="-1" é alvo programático (título, status, região).
const seletorControleFoco = 'a[href], area[href], button, input, select, textarea, summary, iframe, [contenteditable], [tabindex]:not([tabindex="-1"])';
function iniciarSensorFoco(janela, documento) {
  let modo = 'inicial'; // 'inicial' e 'ponteiro' não são navegação por teclado.
  function marcar(alvo) {
    if (!alvo || typeof alvo !== 'object') return;
    const removable = typeof alvo.removeAttribute === 'function';
    if (typeof alvo.matches === 'function' && alvo.matches(seletorControleFoco)) {
      if (removable) alvo.removeAttribute('data-foco-programatico');
      return;
    }
    const tabindex = typeof alvo.getAttribute === 'function' ? alvo.getAttribute('tabindex')
      : alvo.tabIndex === -1 ? '-1' : null;
    if (tabindex !== '-1' || typeof alvo.setAttribute !== 'function') return;
    if (modo === 'teclado') {
      if (removable) alvo.removeAttribute('data-foco-programatico');
    } else {
      alvo.setAttribute('data-foco-programatico', 'true');
    }
  }
  documento.addEventListener('pointerdown', () => { modo = 'ponteiro'; }, true);
  documento.addEventListener('keydown', () => { modo = 'teclado'; }, true);
  documento.addEventListener('focusin', evento => marcar(evento.target), true);
  const api = {
    get modo() { return modo; },
    semTeclado() { return modo !== 'teclado'; },
    marcar
  };
  if (janela && typeof janela === 'object' && !janela.EcoaFoco) janela.EcoaFoco = api;
  return api;
}
function normalizarPreferencias(dados) {
  return {
    tema: ['sistema', 'claro', 'escuro'].includes(dados?.tema) ? dados.tema : 'sistema',
    fonte: [100, 112.5, 125, 150].includes(dados?.fonte) ? dados.fonte : 100
  };
}
function lerPreferencias(armazenamento) {
  try { return normalizarPreferencias(JSON.parse(armazenamento.getItem(chaveAcessibilidade))); }
  catch { return normalizarPreferencias(null); }
}
function salvarPreferencias(armazenamento, preferencias) {
  try { armazenamento.setItem(chaveAcessibilidade, JSON.stringify(normalizarPreferencias(preferencias))); return true; }
  catch { return false; }
}
function temaEfetivo(tema, sistemaEscuro) {
  return tema === 'sistema' ? (sistemaEscuro ? 'escuro' : 'claro') : tema;
}
function proximoTema(tema, sistemaEscuro) {
  return temaEfetivo(tema, sistemaEscuro) === 'escuro' ? 'claro' : 'escuro';
}
function alterarFonte(fonte, direcao) {
  const tamanhos = [100, 112.5, 125, 150];
  const indice = tamanhos.indexOf(normalizarPreferencias({fonte}).fonte);
  return tamanhos[Math.max(0, Math.min(tamanhos.length - 1, indice + direcao))];
}
function aplicarPreferencias(raiz, preferencias, sistemaEscuro) {
  const dados = normalizarPreferencias(preferencias);
  raiz.dataset.tema = temaEfetivo(dados.tema, sistemaEscuro);
  raiz.style.fontSize = dados.fonte + '%';
}
function iniciarAcessibilidade(janela, documento) {
  iniciarSensorFoco(janela, documento);
  let armazenamento;
  try { armazenamento = janela.localStorage; } catch { /* Preferências disponíveis na sessão. */ }
  let preferencias = lerPreferencias(armazenamento);
  const sistema = janela.matchMedia('(prefers-color-scheme: dark)');
  aplicarPreferencias(documento.documentElement, preferencias, sistema.matches);
  sistema.addEventListener('change', () => aplicarPreferencias(documento.documentElement, preferencias, sistema.matches));
  documento.addEventListener('DOMContentLoaded', () => {
    const tema = documento.querySelector('#preferencia-tema');
    const alternar = documento.querySelector('#alternar-tema');
    const temaStatus = documento.querySelector('#tema-status');
    documento.documentElement.dataset.transicoes = 'prontas';
    const aumentar = documento.querySelector('#aumentar-fonte');
    const reduzir = documento.querySelector('#reduzir-fonte');
    const restaurar = documento.querySelector('#restaurar-leitura');
    const aviso = documento.querySelector('#leitura-status');
    function atualizar(salvar = false) {
      aplicarPreferencias(documento.documentElement, preferencias, sistema.matches);
      tema.value = preferencias.tema;
      const escuro = temaEfetivo(preferencias.tema, sistema.matches) === 'escuro';
      alternar.setAttribute('aria-pressed', String(escuro));
      alternar.setAttribute('aria-label', escuro ? 'Ativar modo claro' : 'Ativar modo escuro');
      alternar.setAttribute('title', escuro ? 'Mudar para modo claro' : 'Mudar para modo escuro');
      aumentar.disabled = preferencias.fonte === 150;
      reduzir.disabled = preferencias.fonte === 100;
      documento.querySelector('#tamanho-fonte').textContent = preferencias.fonte + '%';
      if (salvar) {
        const persistiu = salvarPreferencias(armazenamento, preferencias);
        temaStatus.textContent = `Modo ${escuro ? 'escuro' : 'claro'} ativado.` + (persistiu ? '' : ' O ajuste vale nesta sessão.');
        aviso.textContent = `Preferência de tema: ${tema.options[tema.selectedIndex].text}. Fonte: ${preferencias.fonte}%.` +
          (persistiu ? '' : ' O navegador não permitiu guardar; o ajuste vale nesta sessão.');
      }
    }
    sistema.addEventListener('change', () => atualizar());
    alternar.addEventListener('click', () => { preferencias.tema = proximoTema(preferencias.tema, sistema.matches); atualizar(true); });
    tema.addEventListener('change', () => { preferencias.tema = tema.value; atualizar(true); });
    aumentar.addEventListener('click', () => { preferencias.fonte = alterarFonte(preferencias.fonte, 1); atualizar(true); });
    reduzir.addEventListener('click', () => { preferencias.fonte = alterarFonte(preferencias.fonte, -1); atualizar(true); });
    restaurar.addEventListener('click', () => { preferencias = normalizarPreferencias(null); atualizar(true); });
    atualizar();
  });
}
if (typeof module !== 'undefined') module.exports = { normalizarPreferencias, lerPreferencias,
  salvarPreferencias, temaEfetivo, proximoTema, alterarFonte, aplicarPreferencias,
  iniciarSensorFoco, iniciarAcessibilidade };
else iniciarAcessibilidade(window, document);
