(function(){
 const $=id=>document.getElementById(id),form=$('curador-form'),api=window.EcoaPontosOSM;
 let base=null,gerado=null,mapa,camada,marcador,ocupado=false;
 const aviso=t=>{$('curador-status').textContent=t;};
 function invalidar(){gerado=null;$('curador-saida').hidden=true;}
 function posicionar(lat,lon){
  if(!Number.isFinite(lat)||!Number.isFinite(lon))return;
  $('curador-latitude').value=lat.toFixed(6);$('curador-longitude').value=lon.toFixed(6);invalidar();
  if(mapa){if(marcador)marcador.setLatLng([lat,lon]);else marcador=L.marker([lat,lon],{title:'Novo ponto',alt:'Novo ponto'}).addTo(mapa);}
 }
 function desenhar(){
  $('curador-atuais').replaceChildren();camada?.clearLayers();
  for(const p of base){
   const li=document.createElement('li');li.textContent=(p.exemplo?'EXEMPLO FICTÍCIO — não publicado: ':'')+p.nome+' · '+p.cidade;$('curador-atuais').append(li);
  }
  if(mapa)for(const p of api.validarFixosOSM(base)){const popup=document.createElement('div');api.preencherCartaoPonto(document,popup,p);L.marker([p.latitude,p.longitude],{title:p.nome,alt:p.nome}).bindPopup(popup).addTo(camada);}
 }
 async function carregar(){
  if(ocupado)return;ocupado=true;invalidar();base=null;$('curador-gerar').disabled=true;
  try{
   const r=await fetch('pontos-fixos.json');if(!r.ok)throw Error();const dados=await r.json();
   if(!Array.isArray(dados)||dados.some(p=>!p||typeof p.id!=='string'||typeof p.nome!=='string'))throw Error();
   if(api.validarFixosOSM(dados).length!==dados.filter(p=>p.exemplo!==true).length)throw Error();
   base=dados;desenhar();$('curador-gerar').disabled=false;$('curador-base-status').textContent=`${base.length} registros carregados, incluindo exemplos. Nenhum ponto será removido pelo gerador.`;
  }catch{$('curador-base-status').textContent='Não foi possível ler a base atual. Conecte-se e tente novamente; a exportação foi bloqueada para não perder pontos.';ocupado=false;return;}
  try{
   await carregarLeafletCidade(document,window);
   if(!mapa){mapa=L.map('curador-mapa').setView(EcoaMapaInicial.centro,EcoaMapaInicial.zoom);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'}).on('tileerror',()=>{$('curador-mapa-status').textContent='O mapa de fundo não carregou. Use a lista e os campos de coordenadas.';}).addTo(mapa);camada=L.layerGroup().addTo(mapa);mapa.on('click',e=>posicionar(e.latlng.lat,e.latlng.lng));
    mapa.on('moveend',()=>{const c=mapa.getCenter();$('curador-endereco').dataset.enderecoLat=c.lat;$('curador-endereco').dataset.enderecoLon=c.lng;});}
   desenhar();$('curador-mapa-status').textContent='Os marcadores mostram pontos existentes. Exemplos fictícios ficam apenas na lista.';
  }catch{$('curador-mapa-status').textContent='Mapa indisponível. Continue usando os campos de coordenadas e a lista de pontos atuais.';}
  finally{ocupado=false;}
 }
 form.elements.dataVerificacao.value=hojeCurador();
 $('curador-endereco').addEventListener('endereco-selecionado',e=>{const p=e.detail;posicionar(p.latitude,p.longitude);if(p.cidade)form.elements.cidade.value=p.cidade;if(mapa&&Number.isFinite(p.latitude)&&Number.isFinite(p.longitude))mapa.setView([p.latitude,p.longitude],16);aviso('Confira cidade, UF e coordenadas antes de gerar.');});
 form.addEventListener('input',invalidar);form.addEventListener('change',invalidar);
 for(const id of ['latitude','longitude'])$('curador-'+id).addEventListener('change',()=>{const lat=Number(form.elements.latitude.value.replace(',','.')),lon=Number(form.elements.longitude.value.replace(',','.'));if(form.elements.latitude.value&&form.elements.longitude.value&&Math.abs(lat)<=90&&Math.abs(lon)<=180)posicionar(lat,lon);});
 form.addEventListener('submit',e=>{e.preventDefault();invalidar();try{if(!base)throw Error('Carregue a base atual primeiro.');gerado=gerarPontosCurador(base,Object.fromEntries(new FormData(form)),api);$('curador-previa').replaceChildren();api.preencherCartaoPonto(document,$('curador-previa'),{...gerado.ponto,origem:'fixo'});$('curador-texto').value=gerado.trecho;$('curador-saida').hidden=false;aviso(gerado.duplicado?'Já existe um local com nome parecido a menos de 30 m. Mantivemos o ponto atual, sem criar duplicado.':'Prévia pronta. Copie o trecho ou baixe a base completa.');}catch(err){aviso(err.message);}$('curador-status').focus();});
 $('curador-copiar').addEventListener('click',async()=>{if(!gerado)return;try{await navigator.clipboard.writeText(gerado.trecho);aviso('Ponto copiado. Cole como um item da lista no arquivo, cuidando das vírgulas.');}catch{$('curador-texto').focus();$('curador-texto').select();aviso('Selecione e copie o texto do campo abaixo.');}});
 $('curador-baixar').addEventListener('click',()=>{if(!gerado)return;const url=URL.createObjectURL(new Blob([gerado.json],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='pontos-fixos.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);aviso('Arquivo preparado. Substitua public/pontos-fixos.json e siga as instruções de publicação.');});
 $('curador-recarregar').addEventListener('click',carregar);carregar();
})();
