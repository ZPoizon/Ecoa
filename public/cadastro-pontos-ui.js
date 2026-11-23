function iniciarCadastroPontos(doc,ambiente,api){
 const $=id=>doc.getElementById(id);let storage;try{storage=ambiente.localStorage;}catch{}
 const categorias=typeof module!=='undefined'?require('./categorias-pontos'):window.EcoaCategoriasPontos;
 categorias.preencherSelectCategoriaPontos(doc);
 const orientacao=()=>{const campo=$('cadastro-orientacao');if(campo)campo.textContent=categorias.orientacaoCategoriaPontos($('cadastro-categoria')?.value);};
 $('cadastro-categoria')?.addEventListener('change',orientacao);orientacao();
 const cliente=api.criarEnviosPontos(ambiente.EcoaConfig,{fetcher:ambiente.fetch.bind(ambiente),storage,locks:ambiente.navigator.locks});
 const leitura=ambiente.EcoaCompartilhados.criarClientePontosCompartilhados(ambiente.EcoaConfig,{fetcher:ambiente.fetch.bind(ambiente)});
 let mapa,marcador,selecionando=false,enviando=false,denunciando=false,pontoDenuncia;
 let consultaEndereco=0,controleEndereco;
 const aviso=t=>{$('cadastro-status').textContent=t;};
 const dados=()=>{const p={};for(const k of ['nome','cidade','uf','bairro','categoria','endereco','descricao','horario','aceita','telefone','site','lat','lng','website_extra'])p[k]=$('cadastro-'+k).value;p.localPublico=$('cadastro-localPublico').checked;return p;};
 function limparPosicao(){marcador?.remove();marcador=null;selecionando=false;consultaEndereco++;controleEndereco?.abort();}
 function preencherEndereco(p,forcar=false){
  if(!p)return;
  const destinos=[['cadastro-cidade',p.cidade],['cadastro-uf',p.uf||p.UF],['cadastro-bairro',p.bairro],['cadastro-endereco',p.endereco||p.nome||p.rotulo]];
  for(const [id,valor] of destinos){
   const campo=$(id);if(!campo||!valor)continue;
   if(!campo.dataset)campo.dataset={};
   // Nunca sobrescreve algo digitado pela pessoa; apenas campos antes preenchidos automaticamente.
   if(!forcar&&campo.value&&campo.dataset.autoEndereco!=='1')continue;
   campo.value=String(valor);campo.dataset.autoEndereco='1';
  }
 }
 async function reverterEndereco(lat,lng){
  if(typeof ambiente.reverterEndereco!=='function')return;
  const atual=++consultaEndereco;controleEndereco?.abort();controleEndereco=new AbortController();
  try{
   const p=await ambiente.reverterEndereco(lat,lng,{signal:controleEndereco.signal});
   if(atual!==consultaEndereco)return;
   if(p){preencherEndereco(p);aviso('Endereço aproximado preenchido. Confira antes de enviar.');}
  }catch(e){if(atual===consultaEndereco&&e.name!=='AbortError')aviso('Posição selecionada. Confira o endereço antes de enviar.');}
 }
 function posicionar(lat,lng,opcoes={}){
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180){aviso('Endereço sem posição confirmada. Escolha no mapa ou informe as coordenadas.');return;}
  $('cadastro-lat').value=lat.toFixed(6);$('cadastro-lng').value=lng.toFixed(6);$('cadastro-confirmar-duplicado').checked=false;
  if(mapa){if(marcador)marcador.setLatLng([lat,lng]);else marcador=ambiente.L.marker([lat,lng],{title:'Posição do novo ponto',alt:'Posição do novo ponto'}).addTo(mapa);}
  aviso('Posição selecionada. Confira o endereço antes de enviar.');
  if(!opcoes.deGeocodificador)reverterEndereco(lat,lng);
 }
 $('cadastro-abrir').addEventListener('click',()=>{$('cadastro-painel').hidden=false;$('cadastro-abrir').setAttribute('aria-expanded','true');$('cadastro-nome').focus();});
 $('cadastro-fechar').addEventListener('click',()=>{$('cadastro-painel').hidden=true;$('cadastro-abrir').setAttribute('aria-expanded','false');limparPosicao();$('cadastro-abrir').focus();});
 $('cadastro-form').addEventListener('input',e=>{if(e.target!==$('cadastro-confirmar-duplicado')){$('cadastro-confirmar-duplicado').checked=false;$('cadastro-duplicado').hidden=true;}});
 $('cadastro-endereco').addEventListener('input',()=>{$('cadastro-lat').value='';$('cadastro-lng').value='';limparPosicao();});
 function aoEscolherEndereco(p){
  preencherEndereco(p,true);
  posicionar(p?.latitude,p?.longitude,{deGeocodificador:true});
  // Quem move o mapa é a busca única; aqui só preenchemos a posição do cadastro.
 }
 $('cadastro-endereco').addEventListener('endereco-selecionado',e=>aoEscolherEndereco(e.detail));
 doc.addEventListener('cidade-busca-selecionada',e=>{if(e.detail?.tipo==='endereco'&&$('cadastro-painel')?.hidden===false)aoEscolherEndereco(e.detail.endereco);});
 for(const k of ['lat','lng'])$('cadastro-'+k).addEventListener('change',()=>{const a=$('cadastro-lat').value.trim(),b=$('cadastro-lng').value.trim();if(a&&b)posicionar(Number(a.replace(',','.')),Number(b.replace(',','.')));});
 $('cadastro-marcar').addEventListener('click',()=>{if(!mapa){aviso('O mapa ainda não está disponível. Use a busca de endereço ou ajuste as coordenadas.');return;}selecionando=true;aviso('Clique na posição do local no mapa. Pelo teclado, use as setas e depois “Confirmar centro do mapa”.');$('cidade-mapa').scrollIntoView({block:'center'});mapa.getContainer().focus();});
 $('cadastro-centro').addEventListener('click',()=>{if(!mapa){aviso('Use a busca de endereço ou ajuste as coordenadas enquanto o mapa carrega.');return;}const p=mapa.getCenter();posicionar(p.lat,p.lng);selecionando=false;});
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
   for(const id of ['cadastro-cidade','cadastro-uf','cadastro-bairro','cadastro-endereco'])if($(id).dataset)delete $(id).dataset.autoEndereco;
   aviso('Recebemos! Seu ponto aparecerá depois da aprovação.');
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
