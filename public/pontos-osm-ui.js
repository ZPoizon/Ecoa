// Integra mapa, lista, cartão e filtros. Uma só origem de categorias e um só critério
// geográfico: a área visível do mapa. A busca principal é o único seletor de destino.
function iniciarPontosOSM(doc,ambiente,api) {
  const $=id=>doc.getElementById(id),criar=(tag,texto)=>{const e=doc.createElement(tag);if(texto!==undefined)e.textContent=String(texto);return e;};
  const categoriasComuns=typeof module!=='undefined'?require('./categorias-pontos'):window.EcoaCategoriasPontos;
  const inicial=ambiente.EcoaMapaInicial||(typeof module!=='undefined'?require('./cidade-config'):ECOA_MAPA_INICIAL);
  const normalizar=texto=>String(texto||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim().replace(/\s+/g,' ');
  let mapa,camada,categoria='',fixos=[],salvos=[],pontos=[],visiveis=[],compartilhados=[],posicaoPendente,focoAnteriorCartao;
  let pontoFocado=null,ativo=false,basePronta=false;
  let consultaBanco=0,timerBanco,controleBanco,buscaConectada=false;
  let cartaoPonto=null,ultimoMarcador=null,limiteAtingido=false,areaAtual='';
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
  const link=(texto,url)=>{const a=criar('a',texto);a.className='ecoa-button secondary';a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
  const vazioTexto='Ainda não encontramos pontos nesta região.';
  try{const paragrafo=doc.querySelector?.('#osm-vazio p');if(paragrafo)paragrafo.textContent=vazioTexto;}catch{}
  function estado(texto,tipo='inicial') {
    if(tipo==='erro'||tipo==='salvos')texto=visiveis.length?'Não foi possível atualizar. Mostrando pontos salvos.':'Não foi possível atualizar nesta região.';
    else if(tipo==='pronto')texto=!visiveis.length?vazioTexto:limiteAtingido||visiveis.length>=200?'Exibindo até 200 pontos; aproxime para refinar.':`${visiveis.length} ${visiveis.length===1?'ponto encontrado':'pontos encontrados'}.`;
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
    api.preencherCartaoPonto(doc,conteudo,p,{idTitulo:'ponto-cartao-titulo'});
    if(p.origem==='supabase'&&p.bancoId){
      const acoes=criar('div');acoes.className='buttons';
      const denunciar=criar('button','Denunciar este ponto');denunciar.type='button';denunciar.className='secondary';
      denunciar.addEventListener('click',()=>ambiente.ecoaCadastro?.denunciar(p));acoes.append(denunciar);
      conteudo.append(acoes);
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
    // Nenhum filtro de cidade: a área visível é o único recorte geográfico.
    visiveis=api.pontosDisponiveisOSM([...fixos,...compartilhados],salvos,pontos,categoria,bbox());
    if(pontoFocado&&!visiveis.some(x=>x.id===pontoFocado.id))visiveis=[pontoFocado,...visiveis];
    $('osm-lista').replaceChildren();camada?.clearLayers();marcadores.clear();
    $('osm-vazio').hidden=visiveis.length>0;
    for(const p of visiveis){
      const item=criar('li');item.tabIndex=-1;item.className='osm-card';itensLista.set(item,p);
      api.preencherCartaoPonto(doc,item,p);
      const botoes=criar('div');botoes.className='buttons';
      const coord=`${p.latitude},${p.longitude}`;
      botoes.append(link('Como chegar',`https://www.openstreetmap.org/directions?to=${encodeURIComponent(coord)}`));
      if(camada){
        const icon=ambiente.L.divIcon({className:'osm-marker',html:'<span aria-hidden="true">●</span>',iconSize:[44,44],iconAnchor:[22,22]});
        const marker=ambiente.L.marker([p.latitude,p.longitude],{icon,title:p.nome,alt:p.nome,keyboard:true}).addTo(camada);
        marcadores.set(p.id,marker);
        marker.on('click',()=>abrirCartao(p,marker));
        const ver=criar('button','Ver detalhes');ver.type='button';ver.className='secondary';
        ver.addEventListener('click',()=>selecionar(item,marker));botoes.prepend(ver);
      }
      if(p.origem==='supabase'&&p.bancoId){
        const denunciar=criar('button','Denunciar ponto');denunciar.type='button';denunciar.className='secondary';
        denunciar.addEventListener('click',()=>ambiente.ecoaCadastro?.denunciar(p));botoes.append(denunciar);
      }
      item.append(botoes);$('osm-lista').append(item);
    }
    if(cartaoPonto&&!visiveis.some(x=>x.id===cartaoPonto.id))fecharCartao();
    else if(cartaoPonto)destacar(marcadores.get(cartaoPonto.id));
  }
  const busca=api.criarBuscaOSM({consultar:cliente.consultar,receber:lista=>{pontos=lista;renderizar();},estado});
  function atualizar() {
    busca.cancelar();
    if(!ativo)return;
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
    const filtros={categoria,bbox:bbox()};
    const chave=JSON.stringify([categoria,(filtros.bbox||[]).map(n=>Number(n).toFixed(3))]);
    const emCache=cacheBanco?.ler(filtros);
    const mudouRegiao=chave!==areaAtual;
    if(mudouRegiao)areaAtual=chave;
    if(emCache){
      compartilhados=emCache;renderizar();
      $('osm-banco-status').textContent='Mostrando pontos salvos';$('osm-tentar').hidden=false;
    }else if(mudouRegiao){
      // Pontos da área anterior não podem ser apresentados como se fossem do novo destino.
      compartilhados=[];renderizar();
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
        // Resposta válida vazia substitui a anterior; falha nunca apaga o que já estava na área.
        compartilhados=lista;limiteAtingido=atingiu;
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
    mapa.on('moveend',atualizar);
    if(posicaoPendente){mapa.setView(posicaoPendente,15,{animate:false});posicaoPendente=null;}
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
      if(mapa)mapa.setView(pos,15,{animate:false});else{posicaoPendente=pos;$('cidade-carregar').click();}
      estado('Área localizada. Buscando pontos…');
    },()=>{$('osm-perto').disabled=false;estado('Não foi possível obter sua localização. Você pode digitar um lugar.','erro');},{enableHighAccuracy:false,maximumAge:0,timeout:10000});
  });
  function aoPonto(p) {
    pontoFocado=p;
    compartilhados=[p,...compartilhados.filter(x=>x.id!==p.id)];
    if(mapa)mapa.setView([p.latitude,p.longitude],16,{animate:false});else posicaoPendente=[p.latitude,p.longitude];
    renderizar();abrirCartao(p);estado('Ponto encontrado.','pronto');
  }
  function aoEndereco(p) {
    // Cidade e endereço são o mesmo controle: trocar o destino redefine a área visível.
    const ehCidade=!p.cep&&!p.bairro&&normalizar(p.nome)===normalizar(p.cidade)&&p.cidade&&p.uf;
    pontoFocado=null;fecharCartao();
    const pos=[p.latitude,p.longitude];
    if(mapa)mapa.setView(pos,ehCidade?13:16,{animate:false});else posicaoPendente=pos;
    atualizar();
  }
  function conectarBusca(){
    if(buscaConectada||!ambiente.EcoaBuscaCidade?.conectar)return;
    buscaConectada=true;
    ambiente.EcoaBuscaCidade.conectar({
      aoPonto,aoEndereco,
      vies:()=>{const c=mapa?.getCenter?.();return c?{latitude:c.lat,longitude:c.lng}:null;},
      buscarPontos:(termo,opcoes)=>clienteBanco?clienteBanco.consultar({nome:termo},{signal:opcoes?.signal}):[]
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
