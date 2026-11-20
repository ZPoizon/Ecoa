const painelOnu = document.querySelector('#onu');
const statusOnu = document.querySelector('#onu-status');
const listasOnu = document.querySelector('#onu-listas');
const portalOnu = 'https://brasil.un.org/pt-br';
let consultaOnu;

function renderizarOnu(dados = {}, temas = []) {
  const grupos = [
    ['Faça a sua parte', dados.iniciativas, portalOnu + '/take-action'],
    ['Histórias', dados.historias, temas.length === 1 ? portalOnu + '/sdgs/' + temas[0] : portalOnu + '/stories']
  ];
  listasOnu.replaceChildren();
  for (const [nome, itens, url] of grupos) {
    const secao = document.createElement('section');
    const titulo = document.createElement('h4');
    titulo.textContent = nome;
    const lista = document.createElement('ul');
    for (const item of itens || []) {
      const linha = document.createElement('li');
      const link = document.createElement('a');
      link.href = item.url;
      link.textContent = item.titulo;
      linha.append(link);
      if (item.data) linha.append(document.createTextNode(" · " + item.data));
      lista.append(linha);
    }
    const oficial = document.createElement('a');
    oficial.href = url;
    oficial.textContent = nome === 'Histórias' && temas.length === 1
      ? 'Ver o objetivo e o conteúdo relacionado na ONU Brasil'
      : 'Abrir seção oficial na ONU Brasil';
    secao.append(titulo);
    if (lista.children.length) secao.append(lista);
    secao.append(oficial);
    listasOnu.append(secao);
  }
}

document.addEventListener('tema-ods', async ({ detail: temas }) => {
  consultaOnu?.abort();
  painelOnu.hidden = !temas;
  if (!temas) return;
  const consulta = new AbortController();
  consultaOnu = consulta;
  document.querySelector('#onu-tema').textContent = temas.length
    ? temas.map(ods => `ODS ${ods} · ${objetivos[ods - 1]}`).join(' / ')
    : 'Explore as publicações mais recentes.';
  renderizarOnu({}, temas);
  statusOnu.textContent = 'Consultando publicações oficiais…';
  try {
    const resposta = await fetch('/api/onu?ods=' + temas.join(','), { signal: consulta.signal });
    if (!resposta.ok) throw new Error('Consulta indisponível');
    const dados = await resposta.json();
    if (consulta.signal.aborted) return;
    renderizarOnu(dados, temas);
    statusOnu.textContent = [
      dados.iniciativas === null ? 'Iniciativas indisponíveis no momento.' : !dados.iniciativas.length ? 'Nenhuma iniciativa recente com correspondência temática encontrada.' : '',
      dados.historias === null ? 'Histórias indisponíveis no momento.' : !dados.historias.length ? 'Nenhuma história encontrada na consulta.' : ''
    ].filter(Boolean).join(' ');
  } catch {
    if (!consulta.signal.aborted) statusOnu.textContent = 'A consulta automática está indisponível. Os links oficiais continuam abaixo.';
  }
});
