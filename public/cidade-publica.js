// Mapa público: não acessa nem modifica os lugares privados já salvos.
function iniciarMapaPublico(doc,ambiente){
 const $=id=>doc.getElementById(id),config=ambiente.EcoaMapaInicial;
 let mapa,carregando=false,posicao;
 const aviso=t=>{$('cidade-status').textContent=t;};
 $('cidade-busca-endereco').addEventListener('submit',e=>{e.preventDefault();ambiente.Enderecos?.buscar($('cidade-endereco'));});
 $('cidade-endereco').addEventListener('endereco-selecionado',e=>{
  const p=e.detail;
  if(!Number.isFinite(p.latitude)||!Number.isFinite(p.longitude)){aviso('Endereço encontrado, mas sem posição confirmada. Tente incluir rua e cidade.');return;}
  posicao=[p.latitude,p.longitude];if(mapa)mapa.setView(posicao,16,{animate:false});else $('cidade-carregar').click();
 });
 $('cidade-carregar').addEventListener('click',async()=>{
  if(mapa||carregando)return;carregando=true;$('cidade-carregar').disabled=true;aviso('Carregando mapa…');
  try{
   await carregarLeafletCidade(doc,ambiente);
   $('cidade-mapa').hidden=false;
   mapa=ambiente.L.map('cidade-mapa',{scrollWheelZoom:false,zoomAnimation:false,fadeAnimation:false}).setView(posicao||config.centro,posicao?16:config.zoom);
   // Tiles externos não são baixados em massa; offline permanece a base vetorial + lista.
   if(ambiente.navigator.onLine!==false)ambiente.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'}).addTo(mapa);
   else mapa.attributionControl.addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>');
   const vies=()=>{const p=mapa.getCenter();$('cidade-endereco').dataset.enderecoLat=p.lat.toFixed(2);$('cidade-endereco').dataset.enderecoLon=p.lng.toFixed(2);};
   mapa.on('moveend',vies);vies();ambiente.ecoaPontosMapa?.conectar(mapa);ambiente.ecoaCadastro?.conectar(mapa);
   $('cidade-mapa-abertura').hidden=true;aviso('Mapa aberto. Os mesmos locais estão na lista abaixo.');
  }catch{
   mapa?.remove();mapa=null;$('cidade-mapa').hidden=true;
   $('cidade-mapa-abertura').querySelector('p').textContent='Os pontos estão disponíveis na lista abaixo.';
   $('cidade-carregar').hidden=false;aviso('Mapa indisponível; consulte a lista de pontos.');
  }finally{carregando=false;$('cidade-carregar').disabled=false;}
 });
 doc.addEventListener('ecoa-rota',e=>{if(e.detail.tela==='na-cidade'){if(mapa)mapa.invalidateSize({animate:false});else $('cidade-carregar').click();}});
}
if(typeof module!=='undefined')module.exports={iniciarMapaPublico};else iniciarMapaPublico(document,window);
