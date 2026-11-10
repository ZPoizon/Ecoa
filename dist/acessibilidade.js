const chaveAcessibilidade = 'oqdpf-acessibilidade-v1';
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
  let armazenamento;
  try { armazenamento = janela.localStorage; } catch { /* Preferências disponíveis na sessão. */ }
  let preferencias = lerPreferencias(armazenamento);
  const sistema = janela.matchMedia('(prefers-color-scheme: dark)');
  aplicarPreferencias(documento.documentElement, preferencias, sistema.matches);
  sistema.addEventListener('change', () => aplicarPreferencias(documento.documentElement, preferencias, sistema.matches));
  documento.addEventListener('DOMContentLoaded', () => {
    const tema = documento.querySelector('#preferencia-tema');
    const aumentar = documento.querySelector('#aumentar-fonte');
    const reduzir = documento.querySelector('#reduzir-fonte');
    const restaurar = documento.querySelector('#restaurar-leitura');
    const aviso = documento.querySelector('#leitura-status');
    function atualizar(salvar = false) {
      aplicarPreferencias(documento.documentElement, preferencias, sistema.matches);
      tema.value = preferencias.tema;
      aumentar.disabled = preferencias.fonte === 150;
      reduzir.disabled = preferencias.fonte === 100;
      documento.querySelector('#tamanho-fonte').textContent = preferencias.fonte + '%';
      if (salvar) {
        const persistiu = salvarPreferencias(armazenamento, preferencias);
        aviso.textContent = `Preferência de tema: ${tema.options[tema.selectedIndex].text}. Fonte: ${preferencias.fonte}%.` +
          (persistiu ? '' : ' O navegador não permitiu guardar; o ajuste vale nesta sessão.');
      }
    }
    tema.addEventListener('change', () => { preferencias.tema = tema.value; atualizar(true); });
    aumentar.addEventListener('click', () => { preferencias.fonte = alterarFonte(preferencias.fonte, 1); atualizar(true); });
    reduzir.addEventListener('click', () => { preferencias.fonte = alterarFonte(preferencias.fonte, -1); atualizar(true); });
    restaurar.addEventListener('click', () => { preferencias = normalizarPreferencias(null); atualizar(true); });
    atualizar();
  });
}
if (typeof module !== 'undefined') module.exports = { normalizarPreferencias, lerPreferencias,
  salvarPreferencias, temaEfetivo, alterarFonte, aplicarPreferencias, iniciarAcessibilidade };
else iniciarAcessibilidade(window, document);
