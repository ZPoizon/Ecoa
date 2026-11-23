// Configure um ou ambos antes de receber sugestões. Nunca inventar destinatários.
const CONTATO_PONTOS_EMAIL = '';
const CONTATO_PONTOS_WHATSAPP = ''; // Somente dígitos: país + DDD + número.
function linksSugestaoOSM(texto,email=CONTATO_PONTOS_EMAIL,numero=CONTATO_PONTOS_WHATSAPP) {
  return {email:/^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(email)?`mailto:${encodeURIComponent(email)}?subject=Ecoa%20-%20sugest%C3%A3o%20de%20ponto&body=${encodeURIComponent(texto)}`:'',whatsapp:/^\d{10,15}$/.test(numero)?`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`:''};
}
function iniciarPontosOSM(doc,ambiente,api) {
  const $=id=>doc.getElementById(id),criar=(tag,texto)=>{const e=doc.createElement(tag);if(texto!==undefined)e.textContent=String(texto);return e;};
  const inicial=ambiente.EcoaMapaInicial||(typeof module!=='undefined'?require('./cidade-config'):ECOA_MAPA_INICIAL);
  const normalizar=texto=>String(texto||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim().replace(/\s+/g,' ');
  let mapa,camada,categoria='',fixos=[],salvos=[],pontos=[],visiveis=[],compartilhados=[],cidadesRemotas=[],posicaoPendente,focoAnteriorCartao;
  let cidadeAtual=null,enquadrarCidade=false,pontoFocado=null,ativo=false,basePronta=false,fixosFalharam=false;
  let consultaBanco=0,timerBanco,controleBanco,cidadesCarregadas=false,buscaConectada=false;
  let cartaoPonto=null,ultimoMarcador=null,limiteAtingido=false;
  const itensLista=new WeakMap();
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
  function estado(texto,tipo='inicial') {
    $('osm-status').textContent=tipo==='erro'?'Mostrando pontos salvos':texto;
    $('osm-lista').setAttribute('aria-busy',String(tipo==='carregando'));
    $('osm-tentar').hidden=!['erro','salvos'].includes(tipo);
    if(tipo==='pronto')$('osm-status').textContent=limiteAtingido?'Exibindo até 200 pontos; aproxime para refinar.':visiveis.length===200?'Exibindo até 200 pontos; aproxime para refinar.':visiveis.length?`${visiveis.length} ${visiveis.length===1?'ponto encontrado':'pontos encontrados'}.`:'Nenhum ponto por aqui ainda.';
  }
  function sugerir(p) {
    $('osm-sugerir').hidden=false;$('osm-vazio-sugerir').setAttribute('aria-expanded','true');
    if(p){$('osm-sug-nome').value=p.nome;$('osm-sug-endereco').value=[p.endereco,p.cidade,p.UF].filter(Boolean).join(', ');$('osm-sug-detalhes').value=`Correção do ponto: ${p.fonte}\nPosição: ${p.latitude}, ${p.longitude}\nO que precisa mudar: `;}
    $('osm-sug-nome').focus();
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
  function abrirCartao(p,marker) {
    if(!p||!$('ponto-cartao')||!$('ponto-cartao-conteudo'))return;
    const anterior=doc.activeElement,util=anterior&&anterior!==doc.body?anterior:$('cidade-busca-unica');
    if(util&&util!==$('ponto-cartao-titulo'))focoAnteriorCartao=util;
    cartaoPonto=p;ultimoMarcador=marker||null;
    const conteudo=$('ponto-cartao-conteudo');conteudo.replaceChildren();
    $('ponto-cartao-titulo').textContent=String(p.nome);
    api.preencherCartaoPonto(doc,conteudo,p);
    const acoes=criar('div');acoes.className='buttons';
    if(p.origem==='supabase'&&p.bancoId){
      const denunciar=criar('button','Denunciar este ponto');denunciar.type='button';denunciar.className='secondary';
      denunciar.addEventListener('click',()=>ambiente.ecoaCadastro?.denunciar(p));acoes.append(denunciar);
    }else{
      const corrigir=criar('button','Sugerir correção');corrigir.type='button';corrigir.className='secondary';
      corrigir.addEventListener('click',()=>sugerir(p));acoes.append(corrigir);
    }
    conteudo.append(acoes);
    $('ponto-cartao').hidden=false;
    $('ponto-cartao-titulo').focus?.({preventScroll:true});
  }
  function selecionar(item,marker) {
    for(const el of $('osm-lista').children)el.removeAttribute('data-selecionado');
    item.dataset.selecionado='true';item.focus({preventScroll:true});item.scrollIntoView({block:'nearest',behavior:'instant'});
    abrirCartao(itensLista.get(item),marker);
  }
  function renderizar() {
    const b=(cidadeAtual||pontoFocado)?null:bbox();
    const filtros={cidade:cidadeAtual?.cidade||'',uf:cidadeAtual?.uf||'',nome:$('osm-nome')?.value||''};
    const filtrar=lista=>compartilhadoAPI?compartilhadoAPI.filtrarPontosCompartilhados(lista,filtros):lista;
    visiveis=api.pontosDisponiveisOSM(filtrar([...fixos,...compartilhados]),filtrar(salvos),filtrar(pontos),categoria,b);
    if(pontoFocado&&!visiveis.some(x=>x.id===pontoFocado.id))visiveis=[pontoFocado,...visiveis];
    $('osm-lista').replaceChildren();camada?.clearLayers();
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
        marker.on('click',()=>abrirCartao(p,marker));
        const ver=criar('button','Ver detalhes');ver.type='button';ver.className='secondary';
        ver.addEventListener('click',()=>selecionar(item,marker));botoes.prepend(ver);
      }
      const corrigir=criar('button',p.origem==='supabase'?'Denunciar ponto':'Sugerir correção');corrigir.type='button';corrigir.className='secondary';
      corrigir.addEventListener('click',()=>p.origem==='supabase'&&p.bancoId?ambiente.ecoaCadastro?.denunciar(p):sugerir(p));botoes.append(corrigir);
      item.append(botoes);$('osm-lista').append(item);
    }
    if(cartaoPonto&&!visiveis.some(x=>x.id===cartaoPonto.id))fecharCartao();
  }
  const busca=api.criarBuscaOSM({consultar:cliente.consultar,receber:lista=>{pontos=lista;renderizar();},estado});
  function atualizar() {
    busca.cancelar();
    if(!ativo)return;
    agendarBanco();
    if(!online()){estado('Mostrando pontos salvos — offline','salvos');return;}
    if(!mapa){estado('Abra o mapa ou busque um endereço para escolher a área.');return;}
    if(!basePronta)return;
    // Overpass é complemento opcional: só uma categoria, nunca todas de uma vez.
    if(categoria)busca.agendar(categoria,bbox(),mapa.getZoom());
  }
  function cidadesOpcoes(){
    if(!clienteBanco)return;
    const locais=[...fixos,...salvos].filter(p=>p.cidade&&p.UF).map(p=>({cidade:p.cidade,uf:p.UF}));
    const lista=[...new Map([...locais,...cidadesRemotas].map(p=>[p.cidade+' / '+p.uf,p])).values()].sort((a,b)=>a.cidade.localeCompare(b.cidade,'pt-BR'));
    const selecionada=$('osm-cidade').value;
    $('osm-cidade').replaceChildren();const todas=criar('option','Área visível no mapa');todas.value='';$('osm-cidade').append(todas);
    for(const p of lista){const op=criar('option',p.cidade+' / '+p.uf);op.value=JSON.stringify(p);$('osm-cidade').append(op);}
    $('osm-cidade').value=selecionada||'';
  }
  function cancelarBanco(){consultaBanco++;clearTimeout(timerBanco);controleBanco?.abort();}
  function agendarBanco(){
    cancelarBanco();
    if(!clienteBanco||!basePronta||!ativo)return;
    const geracao=consultaBanco;
    const filtros={cidade:cidadeAtual?.cidade||'',uf:cidadeAtual?.uf||'',categoria,nome:$('osm-nome')?$('osm-nome').value:'',bbox:bbox()};
    const chaveCache={...filtros};
    const emCache=cacheBanco?.ler(chaveCache);
    if(emCache){compartilhados=emCache;renderizar();$('osm-banco-status').textContent='Mostrando pontos salvos';$('osm-tentar').hidden=false;}
    if(!online()){if(!emCache)$('osm-banco-status').textContent='Mostrando pontos salvos';return;}
    controleBanco=new AbortController();
    const signal=controleBanco.signal;
    timerBanco=setTimeout(async()=>{
      try{
        let lista,atingiu=false;
        if(clienteBanco.consultarComLimite){const resposta=await clienteBanco.consultarComLimite({...filtros,limite:200},{signal});lista=resposta.pontos;atingiu=resposta.limiteAtingido;}
        else lista=await clienteBanco.consultar(filtros,{signal});
        if(geracao!==consultaBanco)return;
        compartilhados=lista;pontoFocado=null;limiteAtingido=atingiu;
        cacheBanco?.gravar(chaveCache,lista);
        renderizar();estado('Pontos atualizados.','pronto');
        if(enquadrarCidade&&mapa&&visiveis.length){enquadrarCidade=false;mapa.fitBounds(visiveis.map(p=>[p.latitude,p.longitude]),{padding:[30,30],maxZoom:15,animate:false});}
        $('osm-banco-status').textContent='';
      }catch(e){if(geracao===consultaBanco&&e.name!=='AbortError'){$('osm-banco-status').textContent='Mostrando pontos salvos';$('osm-tentar').hidden=false;}}
    },600);
    if(!cidadesCarregadas){cidadesCarregadas=true;clienteBanco.cidades().then(lista=>{cidadesRemotas=lista;cidadesOpcoes();}).catch(()=>{cidadesCarregadas=false;});}
  }
  if(clienteBanco){
    $('osm-cidade').addEventListener('change',()=>{cidadeAtual=$('osm-cidade').value?JSON.parse($('osm-cidade').value):null;enquadrarCidade=!!cidadeAtual;atualizar();});
    $('osm-nome').addEventListener('input',atualizar);
  }
  function conectar(m) {
    mapa=m;camada=ambiente.L.layerGroup().addTo(mapa);
    mapa.on('movestart',()=>{busca.cancelar();cancelarBanco();});
    mapa.on('moveend',atualizar);
    if(posicaoPendente){mapa.setView(posicaoPendente,15,{animate:false});posicaoPendente=null;}
    conectarBusca();atualizar();
  }
  for(const chip of doc.querySelectorAll('[data-categoria-osm]'))chip.addEventListener('click',()=>{
    categoria=chip.dataset.categoriaOsm||'';ativo=true;
    for(const c of doc.querySelectorAll('[data-categoria-osm]'))c.setAttribute('aria-pressed',String(c===chip));
    $('osm-categoria-ajuda').textContent=categoria==='doacao'?'Lojas beneficentes podem aceitar doações; confirme o que recebem.':categoria==='verde'?'Parques, jardins e hortas podem ter restrições de acesso; confira antes de visitar.':categoria==='outros'?'Bibliotecas de rua e centros comunitários: confira as atividades e condições.':'';
    atualizar();if(!mapa&&online())$('cidade-carregar').click();
  });
  $('osm-tentar').addEventListener('click',()=>{if(!mapa)$('cidade-carregar').click();atualizar();});
  $('osm-vazio-marcar')?.addEventListener('click',()=>$('cadastro-abrir').click());
  $('osm-vazio-sugerir').addEventListener('click',()=>sugerir());
  $('osm-fechar-sugestao').addEventListener('click',()=>{$('osm-sugerir').hidden=true;$('osm-vazio-sugerir').setAttribute('aria-expanded','false');$('osm-vazio-sugerir').focus();});
  $('osm-perto').addEventListener('click',()=>{
    if(!ambiente.navigator.geolocation){estado('Este navegador não oferece localização. Digite um endereço.','erro');return;}
    $('osm-perto').disabled=true;estado('Aguardando sua permissão de localização…');
    ambiente.navigator.geolocation.getCurrentPosition(p=>{
      $('osm-perto').disabled=false;const pos=[p.coords.latitude,p.coords.longitude];
      if(mapa)mapa.setView(pos,15,{animate:false});else{posicaoPendente=pos;$('cidade-carregar').click();}
      estado('Área localizada. Buscando pontos…');
    },()=>{$('osm-perto').disabled=false;estado('Não foi possível obter sua localização. Você pode digitar um endereço.','erro');},{enableHighAccuracy:false,maximumAge:0,timeout:10000});
  });
  $('osm-sug-form').addEventListener('submit',e=>{
    e.preventDefault();
    const texto=`Sugestão para o Ecoa\nNome: ${$('osm-sug-nome').value}\nEndereço: ${$('osm-sug-endereco').value}\nDetalhes: ${$('osm-sug-detalhes').value}`;
    $('osm-sug-texto').value=texto;$('osm-sug-resultado').hidden=false;
    const links=linksSugestaoOSM(texto);
    for(const tipo of ['email','whatsapp']){$('osm-enviar-'+tipo).hidden=!links[tipo];if(links[tipo])$('osm-enviar-'+tipo).href=links[tipo];}
    $('osm-contato-aviso').textContent=links.email||links.whatsapp?'Revise a sugestão e escolha como enviar. Nenhum envio é automático.':'O contato do projeto ainda não foi configurado. Você pode copiar a sugestão; ela não foi enviada.';
    $('osm-sug-texto').focus();
  });
  $('osm-copiar').addEventListener('click',async()=>{try{await ambiente.navigator.clipboard.writeText($('osm-sug-texto').value);$('osm-contato-aviso').textContent='Sugestão copiada.';}catch{$('osm-sug-texto').focus();$('osm-sug-texto').select();$('osm-contato-aviso').textContent='Selecione e copie o texto acima.';}});
  function aoPonto(p) {
    cidadeAtual=null;enquadrarCidade=false;pontoFocado=p;
    compartilhados=[p,...compartilhados.filter(x=>x.id!==p.id)];
    if(mapa)mapa.setView([p.latitude,p.longitude],16,{animate:false});else posicaoPendente=[p.latitude,p.longitude];
    renderizar();abrirCartao(p);estado('Ponto encontrado.','pronto');
  }
  function aoEndereco(p) {
    const ehCidade=!p.cep&&!p.bairro&&normalizar(p.nome)===normalizar(p.cidade)&&p.cidade&&p.uf;
    cidadeAtual=ehCidade?{cidade:p.cidade,uf:p.uf}:null;
    enquadrarCidade=!!ehCidade;pontoFocado=null;fecharCartao();
    if(mapa)mapa.setView([p.latitude,p.longitude],ehCidade?12:16,{animate:false});else posicaoPendente=[p.latitude,p.longitude];
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
  ]).then(()=>{basePronta=true;cidadesOpcoes();atualizar();});
  return {conectar,atualizar,pronto,abrirCartao,fecharCartao,todos:()=>[...fixos,...salvos,...pontos,...compartilhados]};
}
if(typeof module!=='undefined')module.exports={iniciarPontosOSM,linksSugestaoOSM};
else window.ecoaPontosMapa=iniciarPontosOSM(document,window,window.EcoaPontosOSM);
