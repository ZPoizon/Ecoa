function resumoPontosCidade(total){return total===1?'1 ponto na sua lista.':`${total} pontos na sua lista.`;}
async function iniciarCidade(doc,ambiente,api) {
  const {categoriasCidade,chaveCidade,validarPontosCidade,lerJsonCidade,unirPontosCidade,filtrarPontosCidade,salvarPontosCidade}=api;
  const $=id=>doc.getElementById(id);
  const inicial=ambiente.EcoaMapaInicial||(typeof module!=='undefined'?require('./cidade-config'):ECOA_MAPA_INICIAL);
  let pontos=[],mapa,camada,carregando=false,leituraFalhou=false,enderecoSelecionado;
  const aviso=texto=>{$('cidade-status').textContent=texto;};
  function criar(tag,texto){const el=doc.createElement(tag);if(texto)el.textContent=texto;return el;}
  function link(texto,url){const a=criar('a',texto);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
  function desenhar() {
    const visiveis=filtrarPontosCidade(pontos,$('cidade-filtro').value,$('cidade-categoria').value);
    $('cidade-lista').replaceChildren();
    $('cidade-total').textContent=resumoPontosCidade(visiveis.length);
    $('cidade-vazio').hidden=visiveis.length>0;
    $('cidade-vazio-titulo').textContent=pontos.length?'Nenhum ponto com esses filtros':'Sua lista começa aqui';
    $('cidade-vazio-texto').textContent=pontos.length?'Tente outra cidade ou tipo de iniciativa.':'Use “Salvar lugar só para mim” para guardar um lugar que você conhece.';
    $('cidade-vazio-acao').textContent='Limpar filtros';
    $('cidade-vazio-acao').hidden=!pontos.length;
    if(camada)camada.clearLayers();
    visiveis.forEach(p=>{
      const item=criar('li'),titulo=criar('h3',p.nome);
      item.append(criar('p',categoriasCidade[p.categoria]),titulo,criar('p',p.cidade+' · '+p.endereco),criar('p',p.detalhes),criar('p','Informado localmente · Fonte consultada em '+p.consultadoEm.split('-').reverse().join('/')));
      const botoes=criar('div');botoes.className='buttons';
      botoes.append(link('Consultar fonte',p.fonte),link('Ver localização',`https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}#map=17/${p.latitude}/${p.longitude}`));
      const remover=criar('button','Remover da minha lista');remover.type='button';remover.className='secondary';remover.setAttribute('aria-label','Remover '+p.nome+' da minha lista');
      remover.addEventListener('click',()=>{
        if(!ambiente.confirm('Remover '+p.nome+' da sua lista local?'))return;
        try{pontos=salvarPontosCidade(ambiente.localStorage,pontos.filter(x=>x.id!==p.id));desenhar();aviso('Local removido.');$('cidade-status').focus();}catch(e){aviso(e.message);}
      });
      botoes.append(remover);item.append(botoes);$('cidade-lista').append(item);
      if(camada){const popup=criar('div');popup.append(criar('strong',p.nome),criar('p',p.endereco),criar('p',p.detalhes),link('Consultar fonte',p.fonte));
        ambiente.L.marker([p.latitude,p.longitude],{title:p.nome,alt:p.nome}).bindPopup(popup).addTo(camada);}
    });
  }
  function guardar(novos){if(leituraFalhou)throw Error('O armazenamento contém dados que não puderam ser lidos. Nenhum cadastro foi sobrescrito.');pontos=salvarPontosCidade(ambiente.localStorage,unirPontosCidade(pontos,novos));desenhar();}
  function baixar(){const url=ambiente.URL.createObjectURL(new Blob([JSON.stringify({versao:1,pontos},null,2)],{type:'application/json'}));const a=criar('a');a.href=url;a.download='ecoa-pontos-locais.json';doc.body.append(a);a.click();a.remove();ambiente.setTimeout(()=>ambiente.URL.revokeObjectURL(url),1000);aviso('Cópia preparada com todos os seus pontos, inclusive os ocultos pelos filtros.');}
  function posicionarEndereco(item) {
    if(!Number.isFinite(item.latitude)||!Number.isFinite(item.longitude)){enderecoSelecionado=null;aviso('Endereço encontrado pelo CEP, mas sem posição confirmada. Preencha as coordenadas manualmente para cadastrar.');return false;}
    enderecoSelecionado=item;
    if(mapa)mapa.setView([item.latitude,item.longitude],16,{animate:false});
    return true;
  }
  $('cidade-busca-endereco').addEventListener('submit',e=>{e.preventDefault();ambiente.Enderecos?.buscar($('cidade-endereco'));});
  $('cidade-endereco').addEventListener('endereco-selecionado',e=>{
    if(!posicionarEndereco(e.detail))return;
    if(!mapa)$('cidade-carregar').click();
    aviso('Endereço localizado. Escolha uma categoria para descobrir pontos nesta área.');
  });
  $('cidade-filtro').addEventListener('endereco-selecionado',e=>{
    $('cidade-filtro').value=e.detail.cidade||e.detail.nome;desenhar();posicionarEndereco(e.detail);
  });
  $('ponto-endereco').addEventListener('endereco-selecionado',e=>{
    $('ponto-latitude').value=e.detail.latitude??'';$('ponto-longitude').value=e.detail.longitude??'';
    $('ponto-cidade').value=e.detail.cidadeUF;posicionarEndereco(e.detail);
  });
  $('ponto-cidade').addEventListener('endereco-selecionado',e=>posicionarEndereco(e.detail));
  const painel=$('cidade-cadastro');
  function abrirCadastro(){painel.hidden=false;$('cidade-adicionar').setAttribute('aria-expanded','true');$('ponto-nome').focus();}
  $('cidade-adicionar').addEventListener('click',abrirCadastro);
  $('cidade-fechar-cadastro').addEventListener('click',()=>{painel.hidden=true;$('cidade-adicionar').setAttribute('aria-expanded','false');$('cidade-adicionar').focus();});
  $('cidade-vazio-acao').addEventListener('click',()=>{
    $('cidade-filtro').value='';$('cidade-categoria').value='';desenhar();$('cidade-filtro').focus();
  });
  $('cidade-exportar').addEventListener('click',baixar);
  $('cidade-filtro').addEventListener('input',desenhar);$('cidade-categoria').addEventListener('change',desenhar);
  $('cidade-form').addEventListener('submit',e=>{
    e.preventDefault();
    try{
      const p={id:ambiente.crypto.randomUUID()};
      for(const campo of ['nome','cidade','categoria','endereco','detalhes','latitude','longitude','fonte','consultadoEm'])p[campo]=$('ponto-'+campo).value;
      for(const campo of ['latitude','longitude']){if(!p[campo].trim())throw Error('Preencha latitude e longitude.');p[campo]=Number(p[campo].replace(',','.'));}
      guardar(validarPontosCidade({versao:1,pontos:[p]}));$('cidade-form').reset();aviso('Ponto salvo neste navegador. Salve uma cópia dos seus pontos para guardar em outro aparelho.');
    }catch(e){const detalhes=$('cidade-form').querySelector?.('.cidade-coordenadas');if(detalhes)detalhes.open=true;aviso(e.message);}
    $('cidade-status').focus();
  });
  $('cidade-importar').addEventListener('change',async e=>{
    const arquivo=e.target.files[0];if(!arquivo)return;
    try{if(!/\.json$/i.test(arquivo.name)||arquivo.size>500000)throw Error('Escolha uma cópia dos pontos salva pelo Ecoa, de até 500 KB.');
      const novos=lerJsonCidade(await arquivo.text());guardar(novos);aviso('Importação concluída. Identificadores já existentes foram preservados.');
    }catch(e){aviso(e.message||'Não foi possível abrir o arquivo.');}finally{e.target.value='';$('cidade-status').focus();}
  });
  $('cidade-carregar').addEventListener('click',async()=>{
    if(mapa||carregando)return;carregando=true;$('cidade-carregar').hidden=true;$('cidade-carregar').disabled=true;aviso('Carregando mapa…');
    try{
      await carregarLeafletCidade(doc,ambiente);
      $('cidade-mapa').hidden=false;
      mapa=ambiente.L.map('cidade-mapa',{scrollWheelZoom:false,zoomAnimation:false,fadeAnimation:false,zoomControl:false}).setView(inicial.centro,inicial.zoom);
      ambiente.L.control.zoom({zoomInTitle:'Aproximar',zoomOutTitle:'Afastar'}).addTo(mapa);
      ambiente.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'}).on('tileerror',()=>aviso('Parte do mapa não carregou. Verifique a conexão; a lista abaixo continua disponível.')).addTo(mapa);
      camada=ambiente.L.layerGroup().addTo(mapa);desenhar();
      if(enderecoSelecionado)posicionarEndereco(enderecoSelecionado);
      const atualizarVies=()=>{
        const centro=mapa.getCenter();
        for(const id of ['cidade-endereco','cidade-filtro','ponto-endereco','ponto-cidade']){
          $(id).dataset.enderecoLat=centro.lat.toFixed(2);$(id).dataset.enderecoLon=centro.lng.toFixed(2);
        }
      };
      if(mapa.on){mapa.on('moveend',atualizarVies);atualizarVies();}
      ambiente.ecoaPontosMapa?.conectar(mapa);
      $('cidade-carregar').hidden=true;$('cidade-mapa-abertura').hidden=true;aviso('Mapa aberto. Os mesmos locais estão na lista abaixo.');
    }catch{$('cidade-carregar').hidden=false;if(mapa){mapa.remove();mapa=null;camada=null;}$('cidade-mapa').hidden=true;aviso('Não foi possível carregar o mapa. A lista e os cadastros continuam funcionando. Você pode tentar novamente.');}
    finally{carregando=false;$('cidade-carregar').disabled=false;}
  });
  try{const salvo=ambiente.localStorage.getItem(chaveCidade);if(salvo)pontos=lerJsonCidade(salvo);}catch{leituraFalhou=true;$('cidade-exportar').disabled=true;aviso('Não foi possível ler os pontos salvos. Nenhum dado foi apagado; novos cadastros estão bloqueados para evitar sobrescrever esses dados.');}
  doc.addEventListener?.('ecoa-rota',e=>{if(e.detail.tela==='na-cidade'){if(mapa)mapa.invalidateSize?.({animate:false});else $('cidade-carregar').click();}});
  desenhar();
}
function carregarLeafletCidade(doc,ambiente) {
  if(ambiente.__ecoaLeafletPronto)return Promise.resolve();
  // Carregamento sob demanda; mapas externos não entram no cache offline do PWA.
  return Promise.allSettled([
    ['link','vendor/leaflet/leaflet.css','sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='],
    ['script','vendor/leaflet/leaflet.js','sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=']
  ].map(([tag,url,hash])=>new Promise((resolve,reject)=>{
    const el=doc.createElement(tag);el.integrity=hash;el.crossOrigin='anonymous';
    if(tag==='link'){el.rel='stylesheet';el.href=url;}else el.src=url;
    const timer=ambiente.setTimeout(()=>{el.remove();reject(Error('Tempo esgotado'));},15000);
    el.onload=()=>{ambiente.clearTimeout(timer);resolve();};el.onerror=()=>{ambiente.clearTimeout(timer);el.remove();reject(Error('Falha na rede'));};doc.head.append(el);
  }))).then(resultados=>{if(resultados.some(r=>r.status==='rejected'))throw Error('Falha ao carregar Leaflet');if(ambiente.L?.Icon?.Default){
      const pin='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 41"><path d="M12.5 40C10 32 1 22 1 13a11.5 11.5 0 0 1 23 0c0 9-9 19-11.5 27Z" fill="#205b3e" stroke="white"/><circle cx="12.5" cy="13" r="4" fill="white"/></svg>');
      ambiente.L.Icon.Default.prototype._getIconUrl=function(nome){return this.options[nome+'Url'];};
      ambiente.L.Icon.Default.mergeOptions({iconUrl:pin,iconRetinaUrl:pin,shadowUrl:null});
    }ambiente.__ecoaLeafletPronto=true;});
}
if(typeof module!=='undefined')module.exports={iniciarCidade,carregarLeafletCidade,resumoPontosCidade};
else if(document.getElementById("cidade-form")) iniciarCidade(document,window,{categoriasCidade,chaveCidade,validarPontosCidade,lerJsonCidade,unirPontosCidade,filtrarPontosCidade,salvarPontosCidade});
