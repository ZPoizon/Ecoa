// Configure um ou ambos antes de receber sugestões. Nunca inventar destinatários.
const CONTATO_PONTOS_EMAIL = '';
const CONTATO_PONTOS_WHATSAPP = ''; // Somente dígitos: país + DDD + número.
function linksSugestaoOSM(texto,email=CONTATO_PONTOS_EMAIL,numero=CONTATO_PONTOS_WHATSAPP) {
  return {email:/^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(email)?`mailto:${encodeURIComponent(email)}?subject=Ecoa%20-%20sugest%C3%A3o%20de%20ponto&body=${encodeURIComponent(texto)}`:'',whatsapp:/^\d{10,15}$/.test(numero)?`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`:''};
}
function iniciarPontosOSM(doc,ambiente,api) {
  const $=id=>doc.getElementById(id),criar=(tag,texto)=>{const e=doc.createElement(tag);if(texto!==undefined)e.textContent=String(texto);return e;};
  const inicial=ambiente.EcoaMapaInicial||(typeof module!=='undefined'?require('./cidade-config'):ECOA_MAPA_INICIAL);
  let mapa,camada,categoria=inicial.categoria,fixos=[],salvos=[],pontos=[],visiveis=[],posicaoPendente,fixosFalharam=false,basePronta=false,ativo=false;
  for(const chip of doc.querySelectorAll('[data-categoria-osm]'))chip.setAttribute('aria-pressed',String(chip.dataset.categoriaOsm===categoria));
  let storage;try{storage=ambiente.sessionStorage;}catch{}
  const cliente=api.criarClienteOSM({fetcher:ambiente.fetch.bind(ambiente),storage});
  const bbox=()=>{if(!mapa)return null;const b=mapa.getBounds();return [b.getSouth(),b.getWest(),b.getNorth(),b.getEast()];};
  const online=()=>ambiente.navigator.onLine!==false;
  const link=(texto,url)=>{const a=criar('a',texto);a.className='ecoa-button secondary';a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
  function estado(texto,tipo='inicial') {
    $('osm-status').textContent=tipo==='erro'?'Mostrando pontos salvos':texto;
    $('osm-lista').setAttribute('aria-busy',String(tipo==='carregando'));
    $('osm-tentar').hidden=!['erro','salvos'].includes(tipo);
    if(tipo==='pronto')$('osm-status').textContent=visiveis.length===200?'Exibindo até 200 pontos; aproxime para refinar.':visiveis.length?`${visiveis.length} ${visiveis.length===1?'ponto encontrado':'pontos encontrados'}.`:'Nenhum ponto encontrado nesta área.';
  }
  function sugerir(p) {
    $('osm-sugerir').hidden=false;$('osm-vazio-sugerir').setAttribute('aria-expanded','true');
    if(p){$('osm-sug-nome').value=p.nome;$('osm-sug-endereco').value=[p.endereco,p.cidade,p.UF].filter(Boolean).join(', ');$('osm-sug-detalhes').value=`Correção do ponto: ${p.fonte}\nPosição: ${p.latitude}, ${p.longitude}\nO que precisa mudar: `;}
    $('osm-sug-nome').focus();
  }
  function selecionar(item,marker) {
    for(const el of $('osm-lista').children)el.removeAttribute('data-selecionado');
    item.dataset.selecionado='true';item.focus({preventScroll:true});item.scrollIntoView({block:'nearest',behavior:'instant'});marker?.openPopup();
  }
  function renderizar() {
    const b=bbox();
    visiveis=api.pontosDisponiveisOSM(fixos,salvos,pontos,categoria,b);
    $('osm-lista').replaceChildren();camada?.clearLayers();
    $('osm-vazio').hidden=!categoria||visiveis.length>0;
    for(const p of visiveis){
      const item=criar('li');item.tabIndex=-1;item.className='osm-card';
      api.preencherCartaoPonto(doc,item,p);
      const botoes=criar('div');botoes.className='buttons';
      const coord=`${p.latitude},${p.longitude}`;
      botoes.append(link('Abrir no Waze',`https://www.waze.com/ul?ll=${encodeURIComponent(coord)}&navigate=yes`));
      const corrigir=criar('button','Sugerir correção');corrigir.type='button';corrigir.className='secondary';corrigir.addEventListener('click',()=>sugerir(p));botoes.append(corrigir);
      item.append(botoes);$('osm-lista').append(item);
      if(camada){
        const icon=ambiente.L.divIcon({className:'osm-marker',html:'<span aria-hidden="true">●</span>',iconSize:[30,30],iconAnchor:[15,15]});
        const marker=ambiente.L.marker([p.latitude,p.longitude],{icon,title:p.nome,alt:p.nome,keyboard:true}).addTo(camada);
        const popup=criar('div');popup.append(criar('strong',p.nome));const abrir=criar('button','Ver detalhes na lista');abrir.type='button';abrir.addEventListener('click',()=>selecionar(item,marker));popup.append(abrir);marker.bindPopup(popup);marker.on('click',()=>selecionar(item,marker));
        const ver=criar('button','Ver no mapa');ver.type='button';ver.className='secondary';ver.addEventListener('click',()=>{selecionar(item,marker);$('cidade-mapa').scrollIntoView({block:'center',behavior:'instant'});marker.getElement()?.focus();});botoes.prepend(ver);
      }
    }
  }
  const busca=api.criarBuscaOSM({consultar:cliente.consultar,receber:lista=>{pontos=lista;renderizar();},estado});
  function atualizar() {
    busca.cancelar();renderizar();
    if(!categoria){estado('Escolha uma categoria para buscar pontos.');return;}
    if(!online()){estado('Mostrando pontos salvos — offline','salvos');return;}
    if(!mapa){estado('Abra o mapa ou busque um endereço para escolher a área.');return;}
    if(!ativo||!basePronta)return;
    busca.agendar(categoria,bbox(),mapa.getZoom());
  }
  function conectar(m) {
    mapa=m;camada=ambiente.L.layerGroup().addTo(mapa);
    mapa.on('movestart',()=>busca.cancelar());mapa.on('moveend',atualizar);
    if(posicaoPendente){mapa.setView(posicaoPendente,15,{animate:false});posicaoPendente=null;}
    atualizar();
  }
  for(const chip of doc.querySelectorAll('[data-categoria-osm]'))chip.addEventListener('click',()=>{
    categoria=chip.dataset.categoriaOsm;ativo=true;
    for(const c of doc.querySelectorAll('[data-categoria-osm]'))c.setAttribute('aria-pressed',String(c===chip));
    $('osm-categoria-ajuda').textContent=categoria==='doacao'?'Lojas beneficentes podem aceitar doações; confirme o que recebem.':categoria==='verde'?'Parques, jardins e hortas podem ter restrições de acesso; confira antes de visitar.':categoria==='outros'?'Bibliotecas de rua e centros comunitários: confira as atividades e condições.':'';
    atualizar();if(!mapa&&online())$('cidade-carregar').click();
  });
  $('osm-tentar').addEventListener('click',()=>{if(!mapa)$('cidade-carregar').click();atualizar();});
  $('osm-vazio-sugerir').addEventListener('click',()=>sugerir());
  $('osm-fechar-sugestao').addEventListener('click',()=>{$('osm-sugerir').hidden=true;$('osm-vazio-sugerir').setAttribute('aria-expanded','false');$('osm-vazio-sugerir').focus();});
  $('osm-perto').addEventListener('click',()=>{
    if(!ambiente.navigator.geolocation){estado('Este navegador não oferece localização. Digite um endereço.','erro');return;}
    $('osm-perto').disabled=true;estado('Aguardando sua permissão de localização…');
    ambiente.navigator.geolocation.getCurrentPosition(p=>{
      $('osm-perto').disabled=false;const pos=[p.coords.latitude,p.coords.longitude];
      if(mapa)mapa.setView(pos,15,{animate:false});else{posicaoPendente=pos;$('cidade-carregar').click();}
      estado(categoria?'Área localizada. Buscando pontos…':'Área localizada. Escolha uma categoria.');
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
  ambiente.addEventListener('offline',atualizar);ambiente.addEventListener('online',atualizar);
  doc.addEventListener('ecoa-rota',e=>{ativo=e.detail.tela==='na-cidade';if(ativo)atualizar();else busca.cancelar();});
  const carregar=async(url,validar)=>{try{const r=await ambiente.fetch(url,{credentials:'same-origin'});if(!r.ok)throw Error();return validar(await r.json());}catch{return [];}};
  const pronto=Promise.all([
    carregar('pontos-osm.json',api.validarBaseOSM).then(lista=>{salvos=lista;renderizar();}),
    carregar('pontos-fixos.json',api.validarFixosOSM).then(lista=>{fixos=lista;renderizar();})
  ]).then(()=>{basePronta=true;atualizar();});
  return {conectar,atualizar,pronto};
}
if(typeof module!=='undefined')module.exports={iniciarPontosOSM,linksSugestaoOSM};
else window.ecoaPontosMapa=iniciarPontosOSM(document,window,window.EcoaPontosOSM);
