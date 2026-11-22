function iniciarCadastroPontos(doc,ambiente,api){
 const $=id=>doc.getElementById(id);let storage;try{storage=ambiente.localStorage;}catch{}
 const cliente=api.criarEnviosPontos(ambiente.EcoaConfig,{fetcher:ambiente.fetch.bind(ambiente),storage,locks:ambiente.navigator.locks});
 const leitura=ambiente.EcoaCompartilhados.criarClientePontosCompartilhados(ambiente.EcoaConfig,{fetcher:ambiente.fetch.bind(ambiente)});
 let mapa,marcador,selecionando=false,enviando=false,denunciando=false,pontoDenuncia;
 const aviso=t=>{$('cadastro-status').textContent=t;};
 const dados=()=>{const p={};for(const k of ['nome','cidade','uf','bairro','categoria','endereco','descricao','horario','aceita','telefone','site','lat','lng','website_extra'])p[k]=$('cadastro-'+k).value;p.localPublico=$('cadastro-localPublico').checked;return p;};
 function limparPosicao(){marcador?.remove();marcador=null;selecionando=false;}
 function posicionar(lat,lng){
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180){aviso('Endereço sem posição confirmada. Escolha no mapa ou informe as coordenadas.');return;}
  $('cadastro-lat').value=lat.toFixed(6);$('cadastro-lng').value=lng.toFixed(6);$('cadastro-confirmar-duplicado').checked=false;
  if(mapa){if(marcador)marcador.setLatLng([lat,lng]);else marcador=ambiente.L.marker([lat,lng],{title:'Posição do novo ponto',alt:'Posição do novo ponto'}).addTo(mapa);}
  aviso('Posição selecionada. Confira o endereço antes de enviar.');
 }
 $('cadastro-abrir').addEventListener('click',()=>{$('cadastro-painel').hidden=false;$('cadastro-abrir').setAttribute('aria-expanded','true');$('cadastro-nome').focus();});
 $('cadastro-fechar').addEventListener('click',()=>{$('cadastro-painel').hidden=true;$('cadastro-abrir').setAttribute('aria-expanded','false');limparPosicao();$('cadastro-abrir').focus();});
 $('cadastro-form').addEventListener('input',e=>{if(e.target!==$('cadastro-confirmar-duplicado')){$('cadastro-confirmar-duplicado').checked=false;$('cadastro-duplicado').hidden=true;}});
 $('cadastro-endereco').addEventListener('input',()=>{$('cadastro-lat').value='';$('cadastro-lng').value='';limparPosicao();});
 $('cadastro-endereco').addEventListener('endereco-selecionado',e=>{const p=e.detail;$('cadastro-cidade').value=p.cidade||'';$('cadastro-uf').value=p.uf||'';$('cadastro-bairro').value=p.bairro||'';posicionar(p.latitude,p.longitude);if(mapa&&Number.isFinite(p.latitude)&&Number.isFinite(p.longitude))mapa.setView([p.latitude,p.longitude],16,{animate:false});});
 for(const k of ['lat','lng'])$('cadastro-'+k).addEventListener('change',()=>{const a=$('cadastro-lat').value.trim(),b=$('cadastro-lng').value.trim();if(a&&b)posicionar(Number(a.replace(',','.')),Number(b.replace(',','.')));});
 $('cadastro-marcar').addEventListener('click',()=>{if(!mapa){aviso('O mapa ainda não está disponível. Use a busca de endereço ou digite as coordenadas.');return;}selecionando=true;aviso('Clique na posição do local no mapa. Pelo teclado, use as setas e depois “Usar o centro do mapa”.');$('cidade-mapa').scrollIntoView({block:'center'});mapa.getContainer().focus();});
 $('cadastro-centro').addEventListener('click',()=>{if(!mapa){aviso('Use a busca de endereço ou digite as coordenadas enquanto o mapa carrega.');return;}const p=mapa.getCenter();posicionar(p.lat,p.lng);selecionando=false;});
 $('cadastro-form').addEventListener('submit',async e=>{
  e.preventDefault();if(enviando)return;enviando=true;$('cadastro-campos').disabled=true;
  try{
   const entrada=dados(),p=api.validarCadastroPonto(entrada);
   if(ambiente.navigator.onLine===false)throw Error('Você está offline. Conecte-se para enviar; os campos continuam preenchidos.');
   aviso('Conferindo possíveis duplicados…');
   // Consulta próxima sem os filtros da tela, para não esconder duplicados de outra categoria.
   const perto=await leitura.consultar({bbox:[Math.max(-90,p.lat-.002),Math.max(-180,p.lng-.002),Math.min(90,p.lat+.002),Math.min(180,p.lng+.002)]});
   const repetidos=api.duplicadosCadastroPonto(p,[...(ambiente.ecoaPontosMapa?.todos()||[]),...perto],ambiente.EcoaPontosOSM);
   if(repetidos.length&&!$('cadastro-confirmar-duplicado').checked){$('cadastro-duplicado-texto').textContent='Pode já existir um ponto parecido a até 100 m: '+repetidos[0].nome+'. Confira antes de continuar.';$('cadastro-duplicado').hidden=false;aviso('Confira o possível duplicado e confirme apenas se for outro local.');return;}
   aviso('Enviando para aprovação…');await cliente.cadastrar(entrada);
   $('cadastro-form').reset();$('cadastro-duplicado').hidden=true;limparPosicao();
   aviso('Recebemos! O ponto aparece depois de aprovado.');
  }catch(e){aviso(e.status?api.mensagemErroEnvioPonto(e.status,e.codigo):['TypeError','AbortError'].includes(e.name)?api.mensagemErroEnvioPonto():e.message);}finally{enviando=false;$('cadastro-campos').disabled=false;$('cadastro-status').focus();}
 });
 function denunciar(p){if(denunciando)return;pontoDenuncia=p;$('denuncia-enviar').disabled=false;$('denuncia-local').textContent=p.nome;$('denuncia-status').textContent='';$('denuncia-form').reset();$('denuncia-dialogo').showModal();}
 $('denuncia-fechar').addEventListener('click',()=>$('denuncia-dialogo').close());
 $('denuncia-form').addEventListener('submit',async e=>{
  e.preventDefault();if(denunciando)return;denunciando=true;$('denuncia-enviar').disabled=true;
  try{if(ambiente.navigator.onLine===false)throw Error('Você está offline. Conecte-se para enviar a denúncia.');await cliente.denunciar(pontoDenuncia?.bancoId,$('denuncia-motivo').value);$('denuncia-status').textContent='Recebemos a denúncia. O ponto será revisado.';pontoDenuncia=null;}
  catch(e){$('denuncia-status').textContent=e.message;}finally{denunciando=false;$('denuncia-enviar').disabled=!pontoDenuncia;if($('denuncia-dialogo').open)$('denuncia-status').focus();}
 });
 $('denuncia-dialogo').addEventListener('close',()=>{if(!denunciando)$('denuncia-enviar').disabled=false;});
 doc.addEventListener('ecoa-rota',()=>{selecionando=false;if($('denuncia-dialogo').open)$('denuncia-dialogo').close();});
 function conectar(m){mapa=m;mapa.on('click',e=>{if(selecionando&&!enviando){posicionar(e.latlng.lat,e.latlng.lng);selecionando=false;}});}
 return {conectar,denunciar};
}
if(typeof module!=='undefined')module.exports={iniciarCadastroPontos};else window.ecoaCadastro=iniciarCadastroPontos(document,window,window.EcoaCadastroPontos);
