function calcularProgressoPlano(planoAtual, catalogo) {
  const porOds=Array.from({length:17},(_,i)=>({ods:i+1,salvas:0,concluidas:0}));
  const vistas=new Set();
  for(const acao of catalogo) {
    const chave=acao.ods+':'+acao.titulo;
    if(vistas.has(chave) || !Number.isInteger(acao.ods) || acao.ods<1 || acao.ods>17) continue;
    vistas.add(chave);
    const estado=planoAtual.get(chave);
    if(typeof estado!=='boolean') continue;
    porOds[acao.ods-1].salvas++;
    if(estado) porOds[acao.ods-1].concluidas++;
  }
  const salvas=porOds.reduce((s,o)=>s+o.salvas,0);
  const concluidas=porOds.reduce((s,o)=>s+o.concluidas,0);
  const objetivosAtendidos=porOds.filter(o=>o.concluidas>0).length;
  const selos=[
    {nome:'Primeiro passo',descricao:'Concluir uma ação.',valor:concluidas,meta:1},
    {nome:'Cinco ações que ecoam',descricao:'Concluir cinco ações diferentes.',valor:concluidas,meta:5},
    {nome:'Agiu em 5 ODS diferentes',descricao:'Concluir pelo menos uma ação em cinco ODS.',valor:objetivosAtendidos,meta:5},
    {nome:'Um passo em cada objetivo',descricao:'Concluir pelo menos uma ação em cada um dos 17 ODS.',valor:objetivosAtendidos,meta:17}
  ].map(s=>({...s,conquistado:s.valor>=s.meta}));
  return {porOds,salvas,concluidas,pendentes:salvas-concluidas,objetivosAtendidos,selos};
}

function renderizarProgressoPlano(documento, dados, nomes) {
  documento.querySelector('#progresso-concluidas').textContent=String(dados.concluidas);
  documento.querySelector('#progresso-pendentes').textContent=String(dados.pendentes);
  documento.querySelector('#progresso-ods').textContent=String(dados.objetivosAtendidos);
  documento.querySelector('#progresso-vazio').hidden=dados.salvas>0;
  const grafico=documento.querySelector('#progresso-grafico');
  grafico.replaceChildren();
  const maximo=Math.max(1,...dados.porOds.map(o=>o.concluidas));
  dados.porOds.filter(o=>o.salvas>0).forEach(item=>{
    const linha=documento.createElement('li');
    const nome=documento.createElement('span');
    nome.className='progresso-rotulo';
    nome.textContent=`ODS ${item.ods} · ${nomes[item.ods-1]}`;
    const quantidade=documento.createElement('span');
    quantidade.textContent=`${item.concluidas} de ${item.salvas} ${item.salvas===1?'ação concluída':'ações concluídas'}`;
    const icone=documento.createElement('img');icone.src=`ods/${item.ods}.webp`;icone.alt='';icone.width=44;icone.height=44;icone.className='progresso-ods-icone';
    nome.append(icone);
    const trilho=documento.createElement('span');
    trilho.className='progresso-trilho';trilho.setAttribute('aria-hidden','true');
    const barra=documento.createElement('span');barra.style.width=(item.concluidas/maximo*100)+'%';
    trilho.append(barra);linha.append(nome,quantidade,trilho);grafico.append(linha);
  });
  const selos=documento.querySelector('#progresso-selos');selos.replaceChildren();
  dados.selos.forEach(selo=>{
    const item=documento.createElement('li');item.className='selo'+(selo.conquistado?' conquistado':'');
    const estado=documento.createElement('span');estado.className='selo-estado';estado.textContent=selo.conquistado?'Conquistado':'A caminho';
    const icone=documento.createElement('span');icone.className='selo-icone';icone.setAttribute('aria-hidden','true');
    icone.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(selo.conquistado?'<path d="m5 12 4 4 10-10"/>':'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 15v2"/>')+'</svg>';
    estado.append(icone);
    const nome=documento.createElement('h4');nome.textContent=selo.nome;
    const descricao=documento.createElement('p');descricao.textContent=selo.descricao;
    const contagem=documento.createElement('p');contagem.className='hint';contagem.textContent=`${Math.min(selo.valor,selo.meta)} de ${selo.meta}`;
    const barra=documento.createElement('progress');barra.className='selo-progresso';barra.setAttribute('max',String(selo.meta));barra.setAttribute('value',String(Math.min(selo.valor,selo.meta)));barra.setAttribute('aria-label',selo.nome);barra.textContent=contagem.textContent;
    item.append(estado,nome,descricao,contagem,barra);selos.append(item);
  });
}
function atualizarProgressoPlano(planoAtual) {
  const dados=calcularProgressoPlano(planoAtual,acoes);
  renderizarProgressoPlano(document,dados,objetivos);
  if(typeof window!=='undefined')window.ecoaInicio?.atualizar(dados);
}
if(typeof module!=='undefined') module.exports={calcularProgressoPlano,renderizarProgressoPlano,atualizarProgressoPlano};
