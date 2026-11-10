function dadosCompartilhamento(acao, endereco) {
  const url = new URL(endereco);
  url.search = '';
  url.hash = 'acao=' + encodeURIComponent(acao.ods + ':' + acao.titulo);
  const text = `${acao.titulo}\nODS ${acao.ods} · ${acao.tempo} min · ${acao.custo ? 'Até R$ ' + acao.custo : 'Sem gastar'} · ${acao.local}\n\n${acao.passos.map((passo, i) => `${i + 1}. ${passo}`).join('\n')}\n\nAção sugerida pelo projeto O Que Dá Pra Fazer?`;
  return { title: acao.titulo, text, url: url.href };
}

function acaoDoLink(hash, catalogo) {
  if (!hash.startsWith('#acao=')) return undefined;
  try {
    const chave = decodeURIComponent(hash.slice(6));
    return catalogo.find(acao => acao.ods + ':' + acao.titulo === chave);
  } catch { return undefined; }
}

function textoCompartilhamento(dados) { return dados.text + '\n' + dados.url; }
function linkWhatsApp(dados) { return 'https://wa.me/?text=' + encodeURIComponent(textoCompartilhamento(dados)); }

async function copiarCompartilhamento(dados, navegador) {
  try {
    if (!navegador.clipboard?.writeText) return 'manual';
    await navegador.clipboard.writeText(textoCompartilhamento(dados));
    return 'copiado';
  } catch { return 'manual'; }
}

async function compartilharAcao(dados, navegador) {
  if (typeof navegador.share === 'function') {
    try {
      await navegador.share(dados);
      return 'compartilhado';
    } catch (erro) {
      if (erro?.name === 'AbortError') return 'cancelado';
    }
  }
  return copiarCompartilhamento(dados, navegador);
}

if (typeof module !== 'undefined') module.exports = {
  dadosCompartilhamento, acaoDoLink, textoCompartilhamento, linkWhatsApp,
  copiarCompartilhamento, compartilharAcao
};
