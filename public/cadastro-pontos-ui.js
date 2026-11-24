function iniciarCadastroPontos(doc,ambiente,api){
  const $=id=>doc.getElementById(id);let storage;try{storage=ambiente.localStorage;}catch{}
  const categorias=typeof module!=='undefined'?require('./categorias-pontos'):window.EcoaCategoriasPontos;
  categorias.preencherSelectCategoriaPontos(doc);
  const orientacao=()=>{const campo=$('cadastro-orientacao');if(campo)campo.textContent=categorias.orientacaoCategoriaPontos($('cadastro-categoria')?.value);};
  $('cadastro-categoria')?.addEventListener('change',orientacao);orientacao();
  const cliente=api.criarEnviosPontos(ambiente.EcoaConfig,{fetcher:ambiente.fetch.bind(ambiente),storage,locks:ambiente.navigator.locks});
  const leitura=ambiente.EcoaCompartilhados.criarClientePontosCompartilhados(ambiente.EcoaConfig,{fetcher:ambiente.fetch.bind(ambiente)});
  const servicoEnderecos=ambiente.Enderecos||{};
  let mapa,marcador,selecionando=false,enviando=false,denunciando=false,pontoDenuncia;
  let consultaEndereco=0,controleEndereco,cepControle,cepTimer,cepSeq=0,geoControle,geoTimer,geoSeq=0;
  const cepCache=new Map(),cepEmVoo=new Map();
  const aviso=t=>{$('cadastro-status').textContent=t;};
  const ajudaPosicao=t=>{$('cadastro-posicao-ajuda').textContent=t;};
  const confirmacao=()=>$('cadastro-posicao-confirmada');
  const digitosCep=valor=>String(valor||'').replace(/\D/g,'');
  const dados=()=>{const p={};for(const k of ['nome','cidade','uf','bairro','categoria','endereco','descricao','horario','aceita','telefone','site','lat','lng','website_extra'])p[k]=$('cadastro-'+k).value;p.localPublico=$('cadastro-localPublico').checked;return p;};
  // A confirmação é um gate local: qualquer mudança de endereço ou posição a invalida.
  function invalidarPosicao(mensagem){
    const campo=confirmacao();if(campo)campo.checked=false;
    if(mensagem)ajudaPosicao(mensagem);
  }
  function limparCoordenadas(){$('cadastro-lat').value='';$('cadastro-lng').value='';}
  function limparPosicao(){
    marcador?.remove();marcador=null;selecionando=false;consultaEndereco++;controleEndereco?.abort();
    cepSeq++;cepControle?.abort();cepEmVoo.clear();geoSeq++;geoControle?.abort();invalidarPosicao();
  }
  function preencherEndereco(p,forcar=false,manterPosicao=false){
    if(!p)return;
    const destinos=[['cadastro-cidade',p.cidade],['cadastro-uf',p.uf||p.UF],['cadastro-bairro',p.bairro],
      ['cadastro-endereco',p.endereco||p.nome||p.rotulo],['cadastro-cep',p.cep]];
    let alterou=false;
    for(const [id,valor] of destinos){
      const campo=$(id);if(!campo||!valor)continue;
      if(!campo.dataset)campo.dataset={};
      // Nunca sobrescreve algo digitado pela pessoa; apenas campos antes preenchidos automaticamente.
      if(!forcar&&campo.value&&campo.dataset.autoEndereco!=='1')continue;
      const texto=String(valor);if(campo.value!==texto)alterou=true;
      campo.value=texto;campo.dataset.autoEndereco='1';
    }
    if(!manterPosicao&&(alterou||forcar)){limparCoordenadas();invalidarPosicao();}
  }
  async function reverterEndereco(lat,lng){
    if(typeof servicoEnderecos.reverter!=='function')return;
    const atual=++consultaEndereco;controleEndereco?.abort();controleEndereco=new AbortController();
    try{
      const p=await servicoEnderecos.reverter(lat,lng,{signal:controleEndereco.signal});
      if(atual!==consultaEndereco)return;
      // O endereço veio da posição escolhida: não pode apagar as coordenadas de novo.
      if(p){preencherEndereco(p,false,true);aviso('Endereço aproximado preenchido. Confira antes de enviar.');}
    }catch(e){if(atual===consultaEndereco&&e.name!=='AbortError')aviso('Posição selecionada. Confira o endereço antes de enviar.');}
  }
  function posicionar(lat,lng,opcoes={}){
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180){aviso('Endereço sem posição confirmada. Escolha no mapa ou informe as coordenadas.');return;}
    invalidarPosicao();limparCoordenadas();
    $('cadastro-lat').value=lat.toFixed(6);$('cadastro-lng').value=lng.toFixed(6);$('cadastro-confirmar-duplicado').checked=false;
    if(mapa){if(marcador)marcador.setLatLng([lat,lng]);else marcador=ambiente.L.marker([lat,lng],{title:'Posição do novo ponto',alt:'Posição do novo ponto'}).addTo(mapa);}
    aviso(opcoes.mensagem||'Posição selecionada. Confira o endereço antes de enviar.');
    if(opcoes.ajuda)ajudaPosicao(opcoes.ajuda);
    if(!opcoes.deGeocodificador)reverterEndereco(lat,lng);
  }
  async function localizarPosicao(){
    const endereco=$('cadastro-endereco').value.trim(),cidade=$('cadastro-cidade').value.trim();
    const uf=$('cadastro-uf').value.trim().toUpperCase(),numero=$('cadastro-sem-numero').checked?'':$('cadastro-numero').value.trim();
    if(endereco.length<5||cidade.length<2||uf.length!==2)return;
    if(typeof servicoEnderecos.localizarCadastro!=='function')return;
    const atual=++geoSeq;geoControle?.abort();geoControle=new AbortController();
    try{
      const p=await servicoEnderecos.localizarCadastro({endereco,numero,bairro:$('cadastro-bairro').value.trim(),cidade,uf},{signal:geoControle.signal});
      if(atual!==geoSeq)return;
      if(!p||!Number.isFinite(p.latitude)||!Number.isFinite(p.longitude)){
        aviso('Não encontramos a posição exata. Marque o local no mapa.');ajudaPosicao('Não encontramos a posição exata. Marque o local no mapa.');return;
      }
      posicionar(p.latitude,p.longitude,{deGeocodificador:true,mensagem:'Confira a posição do local no mapa.',ajuda:'Confira a posição do local no mapa.'});
    }catch(e){
      if(atual!==geoSeq||e.name==='AbortError')return;
      aviso('Não encontramos a posição exata. Marque o local no mapa.');ajudaPosicao('Não encontramos a posição exata. Marque o local no mapa.');
    }
  }
  function agendarGeocodificacao(){
    ambiente.clearTimeout(geoTimer);
    geoTimer=ambiente.setTimeout(()=>localizarPosicao(),600);
  }
  function alterouEndereco(id){
    if($(id).dataset)delete $(id).dataset.autoEndereco;
    limparPosicao();limparCoordenadas();
    invalidarPosicao('Confira a posição do local no mapa.');
    agendarGeocodificacao();
  }
  async function buscarCep(){
    const texto=$('cadastro-cep').value.trim(),digitos=digitosCep(texto);
    const status=$('cadastro-cep-status');
    if(!digitos){status.textContent='CEP opcional. Se não souber, preencha o endereço manualmente.';return;}
    if(!/^\d{5}-?\d{3}$/.test(texto)){
      status.textContent=digitos.length<8?'CEP incompleto: digite os 8 dígitos ou continue preenchendo o endereço.':'CEP inválido: use apenas 8 números ou continue preenchendo o endereço.';
      return;
    }
    if(typeof servicoEnderecos.consultarCep!=='function'){
      status.textContent='Consulta de CEP indisponível. Preencha o endereço manualmente.';return;
    }
    const atual=++cepSeq;
    const aplicar=(p,mensagem)=>{
      if(atual!==cepSeq)return;
      if(!p){status.textContent='CEP inexistente. Confira os números ou preencha o endereço manualmente.';return;}
      $('cadastro-cep').value=p.cep;preencherEndereco(p);
      status.textContent=mensagem||'CEP encontrado. Confira o endereço e a posição no mapa.';
      invalidarPosicao('Confira a posição do local no mapa.');agendarGeocodificacao();
    };
    if(cepCache.has(digitos)){
      cepControle?.abort();aplicar(cepCache.get(digitos));return;
    }
    // Um clique repetido não abre outra requisição para o mesmo CEP.
    if(cepEmVoo.has(digitos)){cepControle?.abort();return;}
    cepControle?.abort();cepControle=new AbortController();
    const promessa=servicoEnderecos.consultarCep(texto,{signal:cepControle.signal});
    cepEmVoo.set(digitos,promessa);status.textContent='Consultando CEP…';
    try{
      const p=await promessa;
      if(atual!==cepSeq)return;
      cepCache.set(digitos,p);aplicar(p);
    }catch(e){
      if(atual!==cepSeq||e.name==='AbortError')return;
      status.textContent=e?.codigoCep==='invalido'||e?.name==='SyntaxError'
        ?'Resposta de CEP inválida. Preencha o endereço manualmente.'
        :'Consulta de CEP indisponível agora. Você pode preencher o endereço manualmente.';
    }finally{
      if(cepEmVoo.get(digitos)===promessa)cepEmVoo.delete(digitos);
    }
  }
  $('cadastro-abrir').addEventListener('click',()=>{$('cadastro-painel').hidden=false;$('cadastro-abrir').setAttribute('aria-expanded','true');$('cadastro-nome').focus();});
  $('cadastro-fechar').addEventListener('click',()=>{$('cadastro-painel').hidden=true;$('cadastro-abrir').setAttribute('aria-expanded','false');limparPosicao();limparCoordenadas();$('cadastro-abrir').focus();});
  $('cadastro-form').addEventListener('input',e=>{if(e.target!==$('cadastro-confirmar-duplicado')){$('cadastro-confirmar-duplicado').checked=false;$('cadastro-duplicado').hidden=true;}});
  $('cadastro-cep').addEventListener('input',()=>{
    ambiente.clearTimeout(cepTimer);limparPosicao();limparCoordenadas();
    if($('cadastro-cep').dataset)delete $('cadastro-cep').dataset.autoEndereco;
    const digitos=digitosCep($('cadastro-cep').value);
    $('cadastro-cep-status').textContent=digitos&&digitos.length<8?'CEP incompleto: digite os 8 dígitos ou continue preenchendo o endereço.':'';
    if(digitos.length===8)cepTimer=ambiente.setTimeout(()=>buscarCep(),350);
  });
  $('cadastro-cep-buscar').addEventListener('click',()=>{ambiente.clearTimeout(cepTimer);buscarCep();});
  for(const id of ['cadastro-endereco','cadastro-numero','cadastro-cidade','cadastro-uf','cadastro-bairro'])$(id).addEventListener('input',()=>alterouEndereco(id));
  $('cadastro-sem-numero').addEventListener('change',()=>{
    const sem=$('cadastro-sem-numero').checked;$('cadastro-numero').disabled=sem;
    if(sem)$('cadastro-numero').value='';
    alterouEndereco('cadastro-numero');
  });
  function aoEscolherEndereco(p){
    preencherEndereco(p,true);
    posicionar(p?.latitude,p?.longitude,{deGeocodificador:true,mensagem:'Confira a posição do local no mapa.',ajuda:'Confira a posição do local no mapa.'});
  }
  $('cadastro-endereco').addEventListener('endereco-selecionado',e=>aoEscolherEndereco(e.detail));
  doc.addEventListener('cidade-busca-selecionada',e=>{if(e.detail?.tipo==='endereco'&&$('cadastro-painel')?.hidden===false)aoEscolherEndereco(e.detail.endereco);});
  for(const k of ['lat','lng'])$('cadastro-'+k).addEventListener('change',()=>{const a=$('cadastro-lat').value.trim(),b=$('cadastro-lng').value.trim();if(a&&b)posicionar(Number(a.replace(',','.')),Number(b.replace(',','.')));});
  $('cadastro-marcar').addEventListener('click',()=>{if(!mapa){aviso('O mapa ainda não está disponível. Use a busca de endereço ou ajuste as coordenadas.');return;}selecionando=true;aviso('Clique na posição do local no mapa. Pelo teclado, use as setas e depois “Confirmar centro do mapa”.');$('cidade-mapa').scrollIntoView({block:'center'});mapa.getContainer().focus();});
  $('cadastro-centro').addEventListener('click',()=>{if(!mapa){aviso('Use a busca de endereço ou ajuste as coordenadas enquanto o mapa carrega.');return;}const p=mapa.getCenter();posicionar(p.lat,p.lng);selecionando=false;});
  confirmacao()?.addEventListener('invalid',()=>aviso('Confirme a posição deste local antes de enviar.'));
  $('cadastro-form').addEventListener('submit',async e=>{
    e.preventDefault();if(enviando)return;
    if(!confirmacao()?.checked){aviso('Confirme a posição deste local antes de enviar.');confirmacao()?.focus();return;}
    enviando=true;$('cadastro-campos').disabled=true;
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
      for(const id of ['cadastro-cidade','cadastro-uf','cadastro-bairro','cadastro-endereco','cadastro-cep'])if($(id).dataset)delete $(id).dataset.autoEndereco;
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
