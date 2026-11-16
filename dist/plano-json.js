// O identificador oqdpf e a versão 1 são preservados para compatibilidade com backups anteriores ao Ecoa.
// Formato de backup independente do armazenamento interno do navegador.
const limitePlanoJson = 100 * 1024;

function validarPlanoJson(texto, catalogo) {
  if (typeof texto !== 'string' || new TextEncoder().encode(texto).length > limitePlanoJson) {
    throw new Error('O arquivo deve ter no máximo 100 KB.');
  }
  let dados;
  try { dados = JSON.parse(texto.replace(/^\uFEFF/, '')); }
  catch { throw new Error('Não foi possível ler esta cópia do plano. Salve uma nova cópia pelo site e tente novamente.'); }
  if (!dados || Array.isArray(dados) || dados.projeto !== 'oqdpf' || dados.versao !== 1) {
    throw new Error('Este arquivo não é uma cópia do plano compatível. Use uma cópia salva pelo Ecoa.');
  }
  if (!Array.isArray(dados.acoes) || dados.acoes.length > catalogo.length) {
    throw new Error('A lista de ações está ausente ou tem itens demais.');
  }
  const conhecidas = new Set(catalogo.map(acao => acao.ods + ':' + acao.titulo));
  const resultado = new Map();
  for (const item of dados.acoes) {
    if (!item || typeof item.chave !== 'string' || typeof item.concluida !== 'boolean') {
      throw new Error('Cada ação precisa ter uma identificação e um estado de conclusão válido.');
    }
    if (!conhecidas.has(item.chave)) throw new Error('O arquivo contém uma ação que não existe no catálogo atual. Nenhuma ação foi importada.');
    if (resultado.has(item.chave)) throw new Error('O arquivo contém ações repetidas. Exporte o plano novamente.');
    resultado.set(item.chave, item.concluida);
  }
  return resultado;
}

function exportarPlanoJson(planoAtual, catalogo) {
  const texto = JSON.stringify({
    projeto: 'oqdpf', versao: 1,
    acoes: [...planoAtual].map(([chave, concluida]) => ({ chave, concluida }))
  }, null, 2);
  validarPlanoJson(texto, catalogo);
  return texto;
}

function mesclarPlanoJson(atual, importado) {
  const combinado = new Map(atual);
  for (const [chave, concluida] of importado) combinado.set(chave, combinado.get(chave) === true || concluida);
  return combinado;
}

function importarPlanoJson(texto, catalogo, atual, armazenamento, chave) {
  const importado = validarPlanoJson(texto, catalogo);
  const combinado = mesclarPlanoJson(atual, importado);
  // Persistir antes de substituir o estado da tela: falhas não apagam o plano atual.
  try { armazenamento.setItem(chave, JSON.stringify(Object.fromEntries(combinado))); }
  catch { throw new Error('O navegador não permitiu salvar a importação. Seu plano atual foi mantido. Libere espaço ou permita o armazenamento e tente novamente.'); }
  return { plano: combinado, quantidade: importado.size, novas: combinado.size - atual.size };
}

async function lerArquivoPlanoJson(arquivo) {
  if (!/\.json$/i.test(arquivo.name)) throw new Error('Escolha uma cópia do plano salva pelo Ecoa.');
  if (arquivo.size > limitePlanoJson) throw new Error('O arquivo deve ter no máximo 100 KB.');
  try { return await arquivo.text(); }
  catch { throw new Error('Não foi possível ler o arquivo. Selecione-o novamente.'); }
}

if (typeof module !== 'undefined') module.exports = {
  validarPlanoJson, exportarPlanoJson, mesclarPlanoJson, importarPlanoJson, lerArquivoPlanoJson
};
