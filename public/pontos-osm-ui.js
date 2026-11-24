// Integra mapa, lista, cartão e filtros. Uma só origem de categorias e um critério
// geográfico por vez: a cidade escolhida na busca ou a área visível do mapa.
function iniciarPontosOSM(doc,ambiente,api) {
  const $=id=>doc.getElementById(id),criar=(tag,texto)=>{const e=doc.createElement(tag);if(texto!==undefined)e.textContent=String(texto);return e;};
  const categoriasComuns=typeof module!=='undefined'?require('./categorias-pontos'):window.EcoaCategoriasPontos;
  const inicial=ambiente.EcoaMapaInicial||(typeof module!=='undefined'?require('./cidade-config'):ECOA_MAPA_INICIAL);
  const normalizar=texto=>String(texto||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim().replace(/\s+/g,' ');
  let mapa,camada,categoria='',fixos=[],salvos=[],pontos=[],visiveis=[],compartilhados=[],posicaoPendente,focoAnteriorCartao;
  let pontoFocado=null,ativo=false,basePronta=false,cidadeFiltro=null;
  let consultaBanco=0,timerBanco,controleBanco,buscaConectada=false;
  let cartaoPonto=null,ultimoMarcador=null,limiteAtingido=false,areaAtual='';
  // Pontos já carregados ficam ancorados: navegar no mapa só acrescenta resultados.
  let preservados=[];
  let promessaCidades=null,cidadesEm=0;
  let baseCidade=[],coberturaCidade=null,geracaoBase=0;
  const gerenteBases=ambiente.EcoaBasesRegiao?.criarGerenciadorBasesRegiao?.({
    fetcher:ambiente.fetch.bind(ambiente),storage:ambiente.sessionStorage
  })||null;
  const marcadores=new Map();
  const compartilhadoAPI=ambiente.EcoaCompartilhados;
  const config=ambiente.EcoaConfig||{};
  const clienteBanco=compartilhadoAPI&&ambiente.EcoaConfig?compartilhadoAPI.criarClientePontosCompartilhados(config,{fetcher:ambiente.fetch.bind(ambiente)}):null;
  let cacheBanco=null;
  try{cacheBanco=ambiente.EcoaPontosCache?.criarCachePontos?.(config,{storage:ambiente.localStorage})||null;}catch{}
  let storage;try{storage=ambiente.sessionStorage;}catch{}
  const cliente=api.criarClienteOSM({fetcher:ambiente.fetch.bind(ambiente),storage});
  const bbox=()=>{if(!mapa)return null;const b=mapa.getBounds();return [b.getSouth(),b.getWest(),b.getNorth(),b.getEast()];};
  const online=()=>ambiente.navigator.onLine!==false;
  const vazioTexto='Ainda não temos pontos cadastrados nesta região.';
  const rotuloCidade=()=>cidadeFiltro?[cidadeFiltro.nome,cidadeFiltro.uf].filter(Boolean).join('/'):'';
  const rotuloAbrangencia=()=>coberturaCidade?.entrada?.abrangencia==='cidade e arredores'
    ? `${rotuloCidade()} e arredores` : rotuloCidade();
  const textoVazio=()=>cidadeFiltro
    ? `Ainda não temos pontos cadastrados em ${rotuloAbrangencia()}. Você pode cadastrar o primeiro lugar.`
    : vazioTexto;
  // O escopo atual decide o que pode aparecer; filtros antigos nunca ficam escondidos.
  function dentroEscopo(p){
    if(cidadeFiltro){
      // Pontos importados carregam o município de origem; non é preciso confiar só no nome.
      if(p.idBaseCidade&&cidadeFiltro.id&&p.idBaseCidade===cidadeFiltro.id)return true;
      if(normalizar(p.cidade||'')!==normalizar(cidadeFiltro.nome))return false;
      return !cidadeFiltro.uf||!p.UF||String(p.UF).toUpperCase()===cidadeFiltro.uf;
    }
    return api.dentroAreaOSM(p,bbox());
  }
  function filtrosBanco(){
    return cidadeFiltro
      ? {categoria,uf:cidadeFiltro.uf,cidade:cidadeFiltro.nome}
      : {categoria,bbox:bbox()};
  }
  function atualizarIndicador(){
    const ajuda=$('osm-filtro-ajuda');
    const cobertura=coberturaCidade?.entrada;
    if(ajuda)ajuda.textContent=cidadeFiltro
      ? `Consultando pontos aprovados em ${rotuloCidade()} e a base disponível. ${cobertura
          ? `Base importada: ${cobertura.quantidade} registros válidos em ${cobertura.abrangencia==='cidade e arredores'?'cidade e arredores':'município'}, gerada em ${cobertura.geradoEm||'data não informada'}${coberturaCidade.origemCache?' (cópia salva)':''}.`
          : 'Ainda não há base importada para esta cidade; só aparecem pontos aprovados no Supabase e pontos OSM da área visível.'} A categoria escolhida continua ativa; navegar no mapa acrescenta pontos da área visível sem remover os já carregados.`
      : 'A busca acima escolhe o lugar. Aqui você escolhe só o tipo de ponto; a lista e o mapa mostram os mesmos lugares da área visível, até 200 resultados. Navegar no mapa acrescenta pontos da nova área; os já carregados permanecem.';
    const paragrafo=doc.querySelector?.('#osm-vazio p');
    if(paragrafo)paragrafo.textContent=textoVazio();
  }
  atualizarIndicador();
  function limparEscopoCidade(){
    if(!cidadeFiltro&&!baseCidade.length&&!coberturaCidade)return;
    geracaoBase++;cidadeFiltro=null;baseCidade=[];preservados=[];coberturaCidade=null;
    if($('osm-banco-status'))$('osm-banco-status').textContent='';
    atualizarIndicador();
  }
  function estado(texto,tipo='inicial') {
    if(tipo==='carregando'&&!texto)texto='Carregando pontos…';
    if(tipo==='erro'||tipo==='salvos')texto=visiveis.length?'Mostrando pontos salvos':'Não foi possível atualizar agora';
    else if(tipo==='pronto')texto=!visiveis.length?textoVazio():limiteAtingido||visiveis.length>=200?'Exibindo até 200 pontos; aproxime para refinar.':`${visiveis.length} ${visiveis.length===1?'ponto encontrado':'pontos encontrados'}.`;
    $('osm-status').textContent=texto;
    $('osm-lista').setAttribute('aria-busy',String(tipo==='carregando'));
    $('osm-tentar').hidden=!['erro','salvos'].includes(tipo);
  }
  function fecharCartao(devolverFoco=false) {
    if(!$('ponto-cartao')||$('ponto-cartao').hidden)return;
    $('ponto-cartao').hidden=true;$('ponto-cartao-conteudo').replaceChildren();
    cartaoPonto=null;
    if(devolverFoco){
      const marcador=ultimoMarcador?.getElement?.();
      if(marcador?.isConnected&&typeof marcador.focus==='function')marcador.focus();
      else if(focoAnteriorCartao?.isConnected&&typeof focoAnteriorCartao.focus==='function')focoAnteriorCartao.focus();
    }
    focoAnteriorCartao=null;
  }
  function destacar(marker) {
    for(const m of marcadores.values())m?.getElement?.()?.classList?.remove?.('osm-marker--selecionado');
    marker?.getElement?.()?.classList?.add?.('osm-marker--selecionado');
  }
  function abrirCartao(p,marker) {
    if(!p||!$('ponto-cartao')||!$('ponto-cartao-conteudo'))return;
    const anterior=doc.activeElement,util=anterior&&anterior!==doc.body?anterior:$('cidade-busca-unica');
    if(util&&util!==$('ponto-cartao-titulo'))focoAnteriorCartao=util;
    cartaoPonto=p;ultimoMarcador=marker||null;
    const conteudo=$('ponto-cartao-conteudo');conteudo.replaceChildren();
    $('ponto-cartao-titulo').textContent=String(p.nome);
    const planoPontos=ambiente.EcoaPlanoPontos||(typeof window!=='undefined'?window.EcoaPlanoPontos:null);
    const acoesPontos=ambiente.EcoaAcoesPontos||(typeof window!=='undefined'?window.EcoaAcoesPontos:null);
    const opcoesCartao={idTitulo:'ponto-cartao-titulo',detalhado:true};
    if(planoPontos&&acoesPontos?.sugestaoAcaoPonto){
      const sugestao=acoesPontos.sugestaoAcaoPonto(p);
      if(sugestao?.acao){
        opcoesCartao.acaoSalva=!!planoPontos.contemAcaoPlano?.(sugestao.acao);
        opcoesCartao.aoSalvarAcao=(sugestaoAtual,ponto)=>planoPontos.salvarAcaoDoPonto(sugestaoAtual?.acao,ponto)?.salva===true;
        opcoesCartao.aoVerPlano=()=>{
          const roteador=ambiente.EcoaRouter||(typeof window!=='undefined'?window.EcoaRouter:null);
          roteador?.navegar?.('#/meu-espaco');
        };
      }
    }
    const acoes=api.preencherCartaoPonto(doc,conteudo,p,opcoesCartao);
    if(p.origem==='supabase'&&p.bancoId){
      const denunciar=criar('button','Denunciar este ponto');denunciar.type='button';denunciar.className='secondary';
      denunciar.addEventListener('click',()=>ambiente.ecoaCadastro?.denunciar(p));acoes.append(denunciar);
    }
    destacar(marker);
    $('ponto-cartao').hidden=false;
    $('ponto-cartao-titulo').focus?.({preventScroll:true});
  }
  function selecionar(item,marker) {
    for(const el of $('osm-lista').children)el.removeAttribute?.('data-selecionado');
    item.dataset.selecionado='true';item.focus({preventScroll:true});item.scrollIntoView({block:'nearest',behavior:'instant'});
    abrirCartao(itensLista.get(item),marker);
  }
  const itensLista=new WeakMap();
  function renderizar() {
    // Cada fonte é filtrada pelo escopo atual antes da mesclagem: nada da cidade anterior.
    const emEscopo=compartilhados.filter(dentroEscopo);
    const importados=baseCidade.filter(dentroEscopo);
    const antigos=cidadeFiltro?salvos.filter(dentroEscopo):salvos;
    const vivos=cidadeFiltro?pontos.filter(dentroEscopo):pontos;
    // Com cidade escolhida não há recorte pela bbox visível: a lista cobre o município.
    visiveis=api.pontosDisponiveisOSM([...fixos,...importados,...emEscopo],antigos,vivos,categoria,cidadeFiltro?null:bbox());
    const ancorados=api.pontosDisponiveisOSM(preservados,[],[],categoria,null);
    visiveis=api.mesclarPontosOSM(ancorados,visiveis);
    if(pontoFocado&&!visiveis.some(x=>x.id===pontoFocado.id))visiveis=[pontoFocado,...visiveis];
    $('osm-lista').replaceChildren();camada?.clearLayers();marcadores.clear();
    $('osm-vazio').hidden=visiveis.length>0;
    for(const p of visiveis){
      if(!preservados.some(x=>x.id===p.id))preservados.push(p);
      const item=criar('li');item.tabIndex=-1;item.className='osm-card';itensLista.set(item,p);
      const botoes=api.preencherCartaoPonto(doc,item,p);
      if(camada){
        const icon=ambiente.L.divIcon({className:'osm-marker',html:'<span aria-hidden="true">●</span>',iconSize:[44,44],iconAnchor:[22,22]});
        const marker=ambiente.L.marker([p.latitude,p.longitude],{icon,title:p.nome,alt:p.nome,keyboard:true}).addTo(camada);
        marcadores.set(p.id,marker);
        marker.on('click',()=>abrirCartao(p,marker));
        const ver=criar('button','Ver detalhes');ver.type='button';
        ver.addEventListener('click',()=>selecionar(item,marker));botoes?.prepend(ver);
      }
      if(p.origem==='supabase'&&p.bancoId){
        const denunciar=criar('button','Denunciar ponto');denunciar.type='button';denunciar.className='secondary';
        denunciar.addEventListener('click',()=>ambiente.ecoaCadastro?.denunciar(p));botoes?.append(denunciar);
      }
      $('osm-lista').append(item);
    }
    if(cartaoPonto&&!visiveis.some(x=>x.id===cartaoPonto.id))fecharCartao();
    else if(cartaoPonto)destacar(marcadores.get(cartaoPonto.id));
  }
  const busca=api.criarBuscaOSM({consultar:cliente.consultar,receber:lista=>{pontos=api.mesclarPontosOSM(pontos,lista);renderizar();},estado});
  function atualizar() {
    busca.cancelar();
    if(!ativo)return;
    renderizar();
    agendarBanco();
    if(!online()){estado('Mostrando pontos salvos — offline','inicial');return;}
    if(!mapa){estado('Abra o mapa ou busque um lugar para escolher a área.');return;}
    if(!basePronta)return;
    // Overpass é complemento opcional: uma categoria por vez, nunca todas de uma vez.
    if(categoria)busca.agendar(categoria,bbox(),mapa.getZoom());
  }
  function cancelarBanco(){consultaBanco++;clearTimeout(timerBanco);controleBanco?.abort();}
  function agendarBanco(){
    cancelarBanco();
    if(!clienteBanco||!basePronta||!ativo)return;
    const geracao=consultaBanco;
    const filtros=filtrosBanco();
    const chave=JSON.stringify([categoria,cidadeFiltro
      ? ['cidade',normalizar(cidadeFiltro.nome),cidadeFiltro.uf]
      : ['area',...(filtros.bbox||[]).map(n=>Number(n).toFixed(3))]]);
    const emCache=cacheBanco?.ler(filtros);
    const mudouRegiao=chave!==areaAtual;
    if(mudouRegiao)areaAtual=chave;
    if(emCache){
      compartilhados=emCache;renderizar();
      $('osm-banco-status').textContent='Mostrando pontos salvos';$('osm-tentar').hidden=false;
    }else if(mudouRegiao){
      // Não descarta a lista: só deixa de mostrar pontos fora do escopo atual.
      // Se a rede falhar, os pontos disponíveis da região permanecem na tela.
      renderizar();
    }
    if(!online()){if(!emCache)$('osm-banco-status').textContent='Mostrando pontos salvos';return;}
    controleBanco=new AbortController();
    const signal=controleBanco.signal;
    timerBanco=setTimeout(async()=>{
      try{
        let lista,atingiu=false;
        if(clienteBanco.consultarComLimite){const resposta=await clienteBanco.consultarComLimite({...filtros,limite:200},{signal});lista=resposta.pontos;atingiu=resposta.limiteAtingido;}
        else lista=await clienteBanco.consultar(filtros,{signal});
        if(geracao!==consultaBanco)return;
        // Resposta válida acrescenta resultados; falha nunca apaga o que já estava na área.
        compartilhados=api.mesclarPontosOSM(compartilhados,lista);limiteAtingido=atingiu;
        cacheBanco?.gravar(filtros,lista);
        $('osm-banco-status').textContent='';
        renderizar();estado('Pontos atualizados.','pronto');
      }catch(e){if(geracao===consultaBanco&&e.name!=='AbortError'){
        $('osm-banco-status').textContent='Não foi possível atualizar; pontos salvos mantidos.';
        $('osm-tentar').hidden=false;estado('Não foi possível atualizar. Mostrando pontos salvos.','salvos');
      }}
    },600);
  }
  function conectar(m) {
    mapa=m;camada=ambiente.L.layerGroup().addTo(mapa);
    mapa.on('movestart',()=>{busca.cancelar();cancelarBanco();});
    mapa.on('moveend',()=>{
      // Navegar no mapa só acrescenta resultados da nova área; nunca apaga os pontos
      // já carregados nem troca a cidade escolhida.
      atualizar();
    });
    if(posicaoPendente){
      mapa.setView(posicaoPendente.pos,posicaoPendente.zoom||15,{animate:false});
      posicaoPendente=null;
    }
    conectarBusca();atualizar();
  }
  categoriasComuns.preencherFiltrosCategoriaPontos(doc);
  for(const chip of doc.querySelectorAll('[data-categoria-osm]'))chip.addEventListener('click',()=>{
    const nova=chip.dataset.categoriaOsm||'';
    // O ponto em foco continua visível enquanto a rede responde; ao trocar de tipo,
    // ele só fica se pertencer ao novo filtro.
    if(nova&&pontoFocado&&api.categoriaMapaOSM(pontoFocado.categoria)!==nova){pontoFocado=null;fecharCartao();}
    categoria=nova;ativo=true;
    for(const c of doc.querySelectorAll('[data-categoria-osm]'))c.setAttribute('aria-pressed',String(c===chip));
    $('osm-categoria-ajuda').textContent=orientacao(categoria);
    atualizar();if(!mapa&&online())$('cidade-carregar').click();
  });
  function orientacao(cat){return categoriasComuns.orientacaoCategoriaPontos(cat);}
  $('osm-tentar').addEventListener('click',()=>{if(!mapa)$('cidade-carregar').click();atualizar();});
  $('osm-vazio-marcar')?.addEventListener('click',()=>$('cadastro-abrir').click());
  $('osm-perto').addEventListener('click',()=>{
    if(!ambiente.navigator.geolocation){estado('Este navegador não oferece localização. Digite um lugar.','erro');return;}
    $('osm-perto').disabled=true;estado('Aguardando sua permissão de localização…');
    ambiente.navigator.geolocation.getCurrentPosition(p=>{
      $('osm-perto').disabled=false;const pos=[p.coords.latitude,p.coords.longitude];
      limparEscopoCidade();
      if(mapa)mapa.setView(pos,15,{animate:false});
      else{posicaoPendente={pos,zoom:15};$('cidade-carregar').click();}
      estado('Área localizada. Buscando pontos…');atualizar();
    },()=>{$('osm-perto').disabled=false;estado('Não foi possível obter sua localização. Você pode digitar um lugar.','erro');},{enableHighAccuracy:false,maximumAge:0,timeout:10000});
  });
  function aoPonto(p) {
    limparEscopoCidade();
    pontoFocado=p;
    compartilhados=[p,...compartilhados.filter(x=>x.id!==p.id)];
    const pos=[p.latitude,p.longitude];
    if(mapa)mapa.setView(pos,16,{animate:false});
    else posicaoPendente={pos,zoom:16};
    renderizar();abrirCartao(p);estado('Ponto encontrado.','pronto');atualizar();
  }
  function enquadrar(pontoLista,centro){
    if(!mapa||!ambiente.L?.latLngBounds)return;
    const coords=pontoLista.map(p=>[p.latitude,p.longitude]).filter(([a,b])=>Number.isFinite(a)&&Number.isFinite(b));
    if(!coords.length&&!Array.isArray(centro))return;
    const limites=coords.length?ambiente.L.latLngBounds(coords):ambiente.L.latLngBounds([centro,centro]);
    mapa.fitBounds(limites.pad(.18),{animate:false,maxZoom:14,padding:[24,24]});
  }
  async function carregarBaseCidade(nome,uf,geracao,pos,zoom){
    baseCidade=[];coberturaCidade=null;
    if(!gerenteBases){renderizar();return;}
    estado('Carregando pontos…','carregando');
    try{
      await gerenteBases.listar();
      const entrada=gerenteBases.encontrar(nome,uf);
      if(geracao!==geracaoBase)return;
      if(cidadeFiltro)cidadeFiltro.id=entrada?.id||null;
      if(!entrada){renderizar();atualizarIndicador();estado('','pronto');return;}
      const base=await gerenteBases.carregar(entrada.id);
      if(geracao!==geracaoBase)return;
      baseCidade=base.pontos;
      coberturaCidade={entrada,origemCache:!!base.origemCache,quantidade:base.pontos.length};
      renderizar();atualizarIndicador();
      if(!pos&&base.pontos.length){
        const p=base.pontos[0];
        if(mapa)enquadrar(base.pontos,entrada.centro);
        else posicaoPendente={pos:[p.latitude,p.longitude],zoom:13};
      }
      if(base.origemCache)$('osm-banco-status').textContent='Mostrando pontos salvos';
      estado('Pontos da base regional carregados.','pronto');
    }catch(e){
      if(geracao!==geracaoBase)return;
      coberturaCidade={entrada:null,erro:true};
      renderizar();atualizarIndicador();
      $('osm-banco-status').textContent='Não foi possível atualizar agora';
    }
  }
  function definirCidade(cidade,pos,zoom){
    const nome=String(cidade?.nome||'').trim().slice(0,100);
    if(!nome)return;
    cidadeFiltro={nome,uf:String(cidade.uf||'').toUpperCase()};
    // Nenhum filtro/cancelamento da cidade anterior pode chegar à nova consulta.
    busca.cancelar();cancelarBanco();
    const geracao=++geracaoBase;
    pontos=[];compartilhados=[];baseCidade=[];preservados=[];coberturaCidade=null;pontoFocado=null;
    limiteAtingido=false;areaAtual='';
    fecharCartao();renderizar();atualizarIndicador();
    if(pos&&Number.isFinite(pos[0])&&Number.isFinite(pos[1])){
      if(mapa)mapa.setView(pos,zoom,{animate:false});
      else posicaoPendente={pos,zoom};
    }
    atualizar();
    carregarBaseCidade(nome,cidadeFiltro.uf,geracao,pos,zoom);
  }
  function aoEndereco(p) {
    // Cidade e endereço compartilham o controle: reconhece cidade pelo nome/UF.
    const ehCidade=!!(p?.cidade&&p.uf)&&(!p.cep&&!p.bairro)&&
      (p.origemCidade===true||normalizar(p.nome)===normalizar(p.cidade)||!p.nome);
    if(ehCidade){definirCidade({nome:p.cidade,uf:p.uf},[p.latitude,p.longitude],13);return;}
    limparEscopoCidade();pontoFocado=null;fecharCartao();
    const pos=[p.latitude,p.longitude];
    if(mapa)mapa.setView(pos,16,{animate:false});
    else posicaoPendente={pos,zoom:16};
    atualizar();
  }
  function aoCidade(p){
    if(!p?.cidade)return;
    definirCidade({nome:p.cidade,uf:p.uf},null,null);
  }
  async function listarCidades(termo){
    if(!clienteBanco)return [];
    const agora=Date.now();
    if(!promessaCidades||agora-cidadesEm>300000){
      cidadesEm=agora;
      promessaCidades=clienteBanco.cidades().catch(e=>{promessaCidades=null;cidadesEm=0;throw e;});
    }
    const cidades=await promessaCidades,alvo=normalizar(termo);
    return cidades.filter(c=>normalizar(c.cidade).includes(alvo)).slice(0,20);
  }
  function conectarBusca(){
    if(buscaConectada||!ambiente.EcoaBuscaCidade?.conectar)return;
    buscaConectada=true;
    ambiente.EcoaBuscaCidade.conectar({
      aoPonto,aoEndereco,aoCidade,
      vies:()=>{const c=mapa?.getCenter?.();return c?{latitude:c.lat,longitude:c.lng}:null;},
      buscarPontos:(termo,opcoes)=>clienteBanco?clienteBanco.consultar({nome:termo},{signal:opcoes?.signal}):[],
      buscarCidades:termo=>listarCidades(termo)
    });
  }
  $('ponto-cartao-fechar')?.addEventListener('click',()=>fecharCartao(true));
  doc.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('ponto-cartao')&&!$('ponto-cartao').hidden){e.preventDefault();fecharCartao(true);}});
  doc.querySelector?.('.atalho-lista-teclado')?.addEventListener('click',()=>{
    const painel=$('lista-pontos-painel');if(painel)painel.open=true;
  });
  ambiente.addEventListener('offline',atualizar);ambiente.addEventListener('online',atualizar);
  doc.addEventListener('ecoa-rota',e=>{ativo=e.detail.tela==='na-cidade';if(ativo){conectarBusca();atualizar();}else{busca.cancelar();cancelarBanco();fecharCartao();}});
  const carregar=async(url,validar)=>{try{const r=await ambiente.fetch(url,{credentials:'same-origin'});if(!r.ok)throw Error();return validar(await r.json());}catch{return [];}};
  conectarBusca();
  const pronto=Promise.all([
    carregar('pontos-osm.json',api.validarBaseOSM).then(lista=>{salvos=lista;renderizar();}),
    carregar('pontos-fixos.json',api.validarFixosOSM).then(lista=>{fixos=lista;renderizar();})
  ]).then(()=>{basePronta=true;atualizar();});
  return {conectar,atualizar,pronto,abrirCartao,fecharCartao,todos:()=>[...fixos,...salvos,...pontos,...compartilhados]};
}
if(typeof module!=='undefined')module.exports={iniciarPontosOSM};
else window.ecoaPontosMapa=iniciarPontosOSM(document,window,window.EcoaPontosOSM);
