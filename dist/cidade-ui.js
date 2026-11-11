async function iniciarCidade(doc,ambiente,api) {
  const {categoriasCidade,chaveCidade,validarPontosCidade,lerJsonCidade,unirPontosCidade,filtrarPontosCidade,salvarPontosCidade}=api;
  const $=id=>doc.getElementById(id);
  let pontos=[],mapa,camada,carregando=false,leituraFalhou=false;
  const aviso=texto=>{$('cidade-status').textContent=texto;};
  function criar(tag,texto){const el=doc.createElement(tag);if(texto)el.textContent=texto;return el;}
  function link(texto,url){const a=criar('a',texto);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
  function desenhar() {
    const visiveis=filtrarPontosCidade(pontos,$('cidade-filtro').value,$('cidade-categoria').value);
    $('cidade-lista').replaceChildren();
    $('cidade-total').textContent=visiveis.length?`${visiveis.length} local(is) na sua lista. Confirme condições e horários na fonte antes de sair.`:pontos.length?'Nenhum local corresponde aos filtros. Tente outra cidade ou categoria.':'Ainda não há pontos cadastrados. Adicione um local que você conhece ou importe um JSON. Isso não significa que sua cidade não tenha iniciativas.';
    if(camada)camada.clearLayers();
    visiveis.forEach(p=>{
      const item=criar('li'),titulo=criar('h3',p.nome);
      item.append(criar('p',categoriasCidade[p.categoria]),titulo,criar('p',p.cidade+' · '+p.endereco),criar('p',p.detalhes),criar('p','Informado localmente · Fonte consultada em '+p.consultadoEm.split('-').reverse().join('/')));
      const botoes=criar('div');botoes.className='buttons';
      botoes.append(link('Consultar fonte',p.fonte),link('Abrir no OpenStreetMap',`https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}#map=17/${p.latitude}/${p.longitude}`));
      const remover=criar('button','Remover da minha lista');remover.type='button';remover.className='secondary';remover.setAttribute('aria-label','Remover '+p.nome+' da minha lista');
      remover.addEventListener('click',()=>{
        if(!ambiente.confirm('Remover '+p.nome+' da sua lista local?'))return;
        try{pontos=salvarPontosCidade(ambiente.localStorage,pontos.filter(x=>x.id!==p.id));desenhar();aviso('Local removido.');$('cidade-status').focus();}catch(e){aviso(e.message);}
      });
      botoes.append(remover);item.append(botoes);$('cidade-lista').append(item);
      if(camada){const popup=criar('div');popup.append(criar('strong',p.nome),criar('p',p.endereco),criar('p',p.detalhes),link('Consultar fonte',p.fonte));
        ambiente.L.marker([p.latitude,p.longitude],{title:p.nome,alt:p.nome}).bindPopup(popup).addTo(camada);}
    });
    if(mapa){if(visiveis.length)mapa.fitBounds(visiveis.map(p=>[p.latitude,p.longitude]),{padding:[24,24],maxZoom:15,animate:false});else mapa.setView([-14.2,-51.9],4);}
  }
  function guardar(novos){if(leituraFalhou)throw Error('O armazenamento contém dados que não puderam ser lidos. Nenhum cadastro foi sobrescrito.');pontos=salvarPontosCidade(ambiente.localStorage,unirPontosCidade(pontos,novos));desenhar();}
  function baixar(){const url=ambiente.URL.createObjectURL(new Blob([JSON.stringify({versao:1,pontos},null,2)],{type:'application/json'}));const a=criar('a');a.href=url;a.download='ecoa-pontos-locais.json';doc.body.append(a);a.click();a.remove();ambiente.setTimeout(()=>ambiente.URL.revokeObjectURL(url),1000);aviso('JSON preparado com todos os seus pontos, inclusive os ocultos pelos filtros.');}
  $('cidade-exportar').addEventListener('click',baixar);
  $('cidade-filtro').addEventListener('input',desenhar);$('cidade-categoria').addEventListener('change',desenhar);
  $('cidade-form').addEventListener('submit',e=>{
    e.preventDefault();
    try{
      const p={id:ambiente.crypto.randomUUID()};
      for(const campo of ['nome','cidade','categoria','endereco','detalhes','latitude','longitude','fonte','consultadoEm'])p[campo]=$('ponto-'+campo).value;
      for(const campo of ['latitude','longitude']){if(!p[campo].trim())throw Error('Preencha latitude e longitude.');p[campo]=Number(p[campo].replace(',','.'));}
      guardar(validarPontosCidade({versao:1,pontos:[p]}));$('cidade-form').reset();aviso('Ponto salvo neste navegador. Use Baixar JSON para guardar uma cópia.');
    }catch(e){aviso(e.message);}
    $('cidade-status').focus();
  });
  $('cidade-importar').addEventListener('change',async e=>{
    const arquivo=e.target.files[0];if(!arquivo)return;
    try{if(!/\.json$/i.test(arquivo.name)||arquivo.size>500000)throw Error('Escolha um arquivo .json de até 500 KB.');
      const novos=lerJsonCidade(await arquivo.text());guardar(novos);aviso('Importação concluída. Identificadores já existentes foram preservados.');
    }catch(e){aviso(e.message||'Não foi possível abrir o arquivo.');}finally{e.target.value='';$('cidade-status').focus();}
  });
  $('cidade-carregar').addEventListener('click',async()=>{
    if(mapa||carregando)return;carregando=true;$('cidade-carregar').disabled=true;aviso('Carregando mapa…');
    try{
      await carregarLeafletCidade(doc,ambiente);
      $('cidade-mapa').hidden=false;
      mapa=ambiente.L.map('cidade-mapa',{scrollWheelZoom:false,zoomAnimation:false,fadeAnimation:false,zoomControl:false}).setView([-14.2,-51.9],4);
      ambiente.L.control.zoom({zoomInTitle:'Aproximar',zoomOutTitle:'Afastar'}).addTo(mapa);
      ambiente.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'}).on('tileerror',()=>aviso('Parte do mapa não carregou. Verifique a conexão; a lista abaixo continua disponível.')).addTo(mapa);
      camada=ambiente.L.layerGroup().addTo(mapa);desenhar();$('cidade-carregar').hidden=true;aviso('Mapa aberto. Os mesmos locais estão na lista abaixo.');
    }catch{if(mapa){mapa.remove();mapa=null;camada=null;}$('cidade-mapa').hidden=true;aviso('Não foi possível carregar o mapa. A lista e os cadastros continuam funcionando. Você pode tentar novamente.');}
    finally{carregando=false;$('cidade-carregar').disabled=false;}
  });
  try{const salvo=ambiente.localStorage.getItem(chaveCidade);if(salvo)pontos=lerJsonCidade(salvo);}catch{leituraFalhou=true;$('cidade-exportar').disabled=true;aviso('Não foi possível ler os pontos salvos. Nenhum dado foi apagado; novos cadastros estão bloqueados para evitar sobrescrever esses dados.');}
  desenhar();
}
function carregarLeafletCidade(doc,ambiente) {
  if(ambiente.__ecoaLeafletPronto)return Promise.resolve();
  // Carregamento sob demanda; mapas externos não entram no cache offline do PWA.
  return Promise.allSettled([
    ['link','https://unpkg.com/leaflet@1.9.4/dist/leaflet.css','sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='],
    ['script','https://unpkg.com/leaflet@1.9.4/dist/leaflet.js','sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=']
  ].map(([tag,url,hash])=>new Promise((resolve,reject)=>{
    const el=doc.createElement(tag);el.integrity=hash;el.crossOrigin='anonymous';
    if(tag==='link'){el.rel='stylesheet';el.href=url;}else el.src=url;
    const timer=ambiente.setTimeout(()=>{el.remove();reject(Error('Tempo esgotado'));},15000);
    el.onload=()=>{ambiente.clearTimeout(timer);resolve();};el.onerror=()=>{ambiente.clearTimeout(timer);el.remove();reject(Error('Falha na rede'));};doc.head.append(el);
  }))).then(resultados=>{if(resultados.some(r=>r.status==='rejected'))throw Error('Falha ao carregar Leaflet');ambiente.__ecoaLeafletPronto=true;});
}
if(typeof module!=='undefined')module.exports={iniciarCidade,carregarLeafletCidade};
else iniciarCidade(document,window,{categoriasCidade,chaveCidade,validarPontosCidade,lerJsonCidade,unirPontosCidade,filtrarPontosCidade,salvarPontosCidade});
