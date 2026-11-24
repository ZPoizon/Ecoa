/* Photon público: uso razoável, sem cota numérica garantida. Uso intenso pode
 * sofrer bloqueio; sem SLA. Para escala, trocar provedor ou hospedar instância.
 * https://github.com/komoot/photon#demo-server — consultado em 11/11/2026.
 */
const ufsEndereco={'Acre':'AC','Alagoas':'AL','Amapá':'AP','Amazonas':'AM','Bahia':'BA','Ceará':'CE','Distrito Federal':'DF','Espírito Santo':'ES','Goiás':'GO','Maranhão':'MA','Mato Grosso':'MT','Mato Grosso do Sul':'MS','Minas Gerais':'MG','Pará':'PA','Paraíba':'PB','Paraná':'PR','Pernambuco':'PE','Piauí':'PI','Rio de Janeiro':'RJ','Rio Grande do Norte':'RN','Rio Grande do Sul':'RS','Rondônia':'RO','Roraima':'RR','Santa Catarina':'SC','São Paulo':'SP','Sergipe':'SE','Tocantins':'TO'};
function normalizarBuscaEndereco(texto) {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim().replace(/\s+/g,' ');
}
function identificarCepEndereco(texto) {
  const limpo=texto.trim();
  return /^\d{5}-?\d{3}$/.test(limpo)?limpo.replace('-',''):null;
}
let idiomaPhotonEndereco='pt';
// Única consulta ao ViaCEP, compartilhada pela busca e pelo cadastro.
// Erros têm código próprio para a interface distinguir "não existe" de falha de rede.
async function consultarViaCep(cep,{signal,fetcher=globalThis.fetch}={}) {
  const codigo=identificarCepEndereco(cep);if(!codigo)return null;
  const resposta=await fetcher(`https://viacep.com.br/ws/${codigo}/json/`,{signal,cache:'no-store',credentials:'omit'});
  if(!resposta.ok)throw Object.assign(Error('Consulta de CEP indisponível'),{codigoCep:'indisponivel'});
  const p=await resposta.json();if(p.erro)return null;
  const texto=x=>typeof x==='string'?x.slice(0,300):'';
  const cidade=texto(p.localidade),uf=texto(p.uf),bairro=texto(p.bairro),rua=texto(p.logradouro);
  if(!cidade||!uf)throw Object.assign(Error('Resposta de CEP inválida'),{codigoCep:'invalido'});
  return {cep:codigo.slice(0,5)+'-'+codigo.slice(5),endereco:rua,bairro,cidade,uf};
}
// Geocodifica o endereço completo do cadastro no provedor já usado pela busca.
// Só aceita resultado brasileiro da mesma cidade/UF; número entra na consulta.
async function localizarEnderecoCadastro(dados,{signal,fetcher=globalThis.fetch}={}) {
  const partes=[dados?.endereco,dados?.numero,dados?.bairro,dados?.cidade,dados?.uf,'Brasil'].filter(v=>typeof v==='string'&&v.trim()).map(v=>v.trim());
  const cidade=String(dados?.cidade||''),uf=String(dados?.uf||'').toUpperCase();
  if(partes.length<3||cidade.trim().length<2||uf.length!==2)return null;
  const itens=await consultarProvedorEndereco(partes.join(', '),{signal,fetcher});
  const encontrado=itens.find(item=>item.brasil!==false&&item.uf?.toUpperCase()===uf&&
    normalizarBuscaEndereco(item.cidade||'')===normalizarBuscaEndereco(cidade));
  if(!encontrado||!Number.isFinite(encontrado.latitude)||!Number.isFinite(encontrado.longitude))return null;
  return {latitude:encontrado.latitude,longitude:encontrado.longitude,aproximado:true};
}
// Único adaptador do provedor: retorna o formato interno, independente do Photon.
async function consultarProvedorEndereco(consulta,{signal,vies,fetcher=globalThis.fetch}={}) {
  const cep=identificarCepEndereco(consulta);
  if(cep) {
    const dados=await consultarViaCep(cep,{signal,fetcher});
    if(!dados)return [];
    const {bairro,cidade,uf}=dados,rua=dados.endereco;
    let coordenadas=null;
    try {
      const locais=await consultarProvedorEndereco([rua,cidade,uf,'Brasil'].filter(Boolean).join(' '),{signal,vies,fetcher});
      coordenadas=locais.find(l=>l.brasil&&normalizarBuscaEndereco(l.cidade)===normalizarBuscaEndereco(cidade)&&l.uf===uf);
    }catch(e){if(signal?.aborted)throw e;}
    const nome=rua||cidade,cidadeUF=cidade+'/'+uf,formatado=dados.cep;
    const subtitulo=[bairro,cidadeUF,'CEP '+formatado,coordenadas?'Posição aproximada — confira no mapa':'Sem coordenadas — preencha manualmente'].filter(Boolean).join(' · ');
    return [{nome,bairro,cidade,uf,cidadeUF,cep:formatado,rotulo:[nome,bairro,cidadeUF,'CEP '+formatado].filter(Boolean).join(' — '),subtitulo,latitude:coordenadas?.latitude??null,longitude:coordenadas?.longitude??null,brasil:true}];
  }
  // Evita consultas de CEP incompleto e inválido.
  if(/^[\d\s-]+$/.test(consulta))return [];
  const url=new URL('https://photon.komoot.io/api/');
  url.searchParams.set('q',normalizarBuscaEndereco(consulta));url.searchParams.set('lang',idiomaPhotonEndereco);url.searchParams.set('limit','5');
  const centro=vies||{latitude:-14.2,longitude:-51.9};
  url.searchParams.set('lat',String(centro.latitude));url.searchParams.set('lon',String(centro.longitude));
  // Brasil primeiro, sem excluir endereços de outros países.
  let resposta=await fetcher(url.href,{signal,cache:'no-store',credentials:'omit'});
  // A instância pública recusa pt com 400 (às vezes sem corpo). Repete sem o idioma
  // e guarda a escolha para não repetir a falha nas próximas consultas.
  if(resposta.status===400&&idiomaPhotonEndereco==='pt') {
    idiomaPhotonEndereco='default';url.searchParams.set('lang','default');
    resposta=await fetcher(url.href,{signal,cache:'no-store',credentials:'omit'});
  }
  if(!resposta.ok)throw Error('Serviço de endereços indisponível');
  const dados=await resposta.json();if(!Array.isArray(dados.features))throw Error('Resposta inválida');
  return formatarEnderecosPhoton(dados);
}
function formatarEnderecosPhoton(dados) {
  const texto=x=>typeof x==='string'?x.slice(0,300):'';
  return (dados.features||[]).map(f=>{
    const p=f.properties||{},coordenadas=f.geometry?.coordinates;
    if(!Array.isArray(coordenadas)||!Number.isFinite(coordenadas[0])||!Number.isFinite(coordenadas[1])||Math.abs(coordenadas[0])>180||Math.abs(coordenadas[1])>90)return null;
    const nome=texto(p.name)||texto(p.street)||texto(p.city)||texto(p.state);
    const rua=[texto(p.street),texto(p.housenumber)].filter(Boolean).join(', ');
    const bairro=texto(p.district)||texto(p.suburb)||texto(p.locality);
    const cidade=texto(p.city)||texto(p.town)||texto(p.village)||(['city','town','village','municipality'].includes(p.type||p.osm_value)?texto(p.name):'')||texto(p.county);
    const uf=ufsEndereco[texto(p.state)]||texto(p.state);
    const cidadeUF=[cidade,uf].filter(Boolean).join('/');
    const titulo=rua&&rua!==nome?`${nome} · ${rua}`:nome;
    const subtitulo=[bairro,cidadeUF, String(p.countrycode).toUpperCase()==='BR'?'':texto(p.country)].filter(Boolean).join(' · ');
    return nome?{nome:titulo,bairro,cidade,uf,cidadeUF,rotulo:[titulo,subtitulo].filter(Boolean).join(' — '),subtitulo,latitude:coordenadas[1],longitude:coordenadas[0],brasil:String(p.countrycode).toUpperCase()==='BR'}:null;
  }).filter(Boolean).sort((a,b)=>Number(b.brasil)-Number(a.brasil)).slice(0,5);
}
async function reverterEndereco(lat,lng,{signal,fetcher=globalThis.fetch}={}) {
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return null;
  const url=new URL('https://photon.komoot.io/reverse');
  url.searchParams.set('lat',String(lat));url.searchParams.set('lon',String(lng));
  url.searchParams.set('lang',idiomaPhotonEndereco);url.searchParams.set('limit','1');
  let resposta=await fetcher(url.href,{signal,cache:'no-store',credentials:'omit'});
  if(resposta.status===400&&idiomaPhotonEndereco==='pt'){
    idiomaPhotonEndereco='default';url.searchParams.set('lang','default');
    resposta=await fetcher(url.href,{signal,cache:'no-store',credentials:'omit'});
  }
  if(!resposta.ok)throw Error('Serviço de endereços indisponível');
  const dados=await resposta.json();if(!Array.isArray(dados.features))throw Error('Resposta inválida');
  const lista=formatarEnderecosPhoton(dados);
  return lista.find(p=>p.brasil)||lista[0]||null;
}
function criarServicoEnderecos(provedor=consultarProvedorEndereco) {
  const cache=new Map();
  return async function buscar(consulta,opcoes={}) {
    consulta=identificarCepEndereco(consulta)||normalizarBuscaEndereco(consulta);if(consulta.length<3)return [];
    const chave=JSON.stringify([consulta.toLocaleLowerCase('pt-BR'),opcoes.vies||null]);
    if(cache.has(chave)){const valor=cache.get(chave);cache.delete(chave);cache.set(chave,valor);return valor;}
    const itens=(await provedor(consulta,opcoes)).slice(0,5);
    if(opcoes.signal?.aborted)throw Object.assign(Error('Cancelado'),{name:'AbortError'});
    cache.set(chave,itens);if(cache.size>50)cache.delete(cache.keys().next().value);
    return itens;
  };
}
function criarControleEndereco({buscar,atualizar,vies=()=>null,relogio=globalThis}) {
  let timer,controle,geracao=0;
  function cancelar(){relogio.clearTimeout(timer);controle?.abort();geracao++;}
  async function executar(texto) {
    cancelar();const atual=geracao;
    if(texto.trim().length<3){atualizar('fechado',[]);return [];}
    controle=new AbortController();const requisicao=controle;atualizar('carregando',[]);
    const timeout=relogio.setTimeout(()=>requisicao.abort(),10000);
    try{const itens=await buscar(texto,{signal:controle.signal,vies:vies()});if(atual!==geracao)return [];
      if(controle.signal.aborted)throw Error('Tempo esgotado');atualizar(itens.length?'pronto':'vazio',itens);return itens;
    }catch(e){if(atual===geracao)atualizar('erro',[]);return [];}finally{relogio.clearTimeout(timeout);}
  }
  function digitar(texto){cancelar();atualizar('fechado',[]);if(texto.trim().length>=3)timer=relogio.setTimeout(()=>executar(texto),350);}
  return {digitar,executar,cancelar};
}
function iniciarEnderecos(doc,ambiente,provedor=consultarProvedorEndereco) {
  const buscar=criarServicoEnderecos(provedor),campos=new WeakMap();let sequencia=0;
  function conectar(input) {
    if(campos.has(input))return;
    const caixa=doc.createElement('div');caixa.className='endereco-autocomplete';
    input.parentNode.insertBefore(caixa,input);caixa.append(input);
    const lista=doc.createElement('ul'),status=doc.createElement('p');lista.id='enderecos-lista-'+(++sequencia);lista.className='endereco-lista';lista.setAttribute('role','listbox');lista.setAttribute('aria-label','Sugestões de endereços');lista.hidden=true;
    status.id=lista.id+'-status';status.className='endereco-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    caixa.append(lista,status);input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','false');input.setAttribute('aria-controls',lista.id);input.setAttribute('autocomplete','off');
    input.setAttribute('aria-describedby',((input.getAttribute('aria-describedby')||'')+' '+status.id).trim());
    let itens=[],ativo=-1,compondo=false;
    function fechar(){controle.cancelar();lista.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');status.textContent='';ativo=-1;}
    function selecionar(item){input.value=input.dataset.enderecoFormato==='cidade'?(item.cidadeUF||item.nome):item.rotulo;fechar();input.dispatchEvent(new ambiente.Event('input',{bubbles:true}));controle.cancelar();input.dispatchEvent(new ambiente.CustomEvent('endereco-selecionado',{bubbles:true,detail:item}));}
    function atualizar(estado,resultados){itens=resultados;ativo=-1;lista.replaceChildren();input.removeAttribute('aria-activedescendant');lista.hidden=estado!=='pronto';input.setAttribute('aria-expanded',String(!lista.hidden));
      status.textContent=({carregando:'Buscando endereços…',vazio:'Nenhum endereço encontrado. Informe rua e cidade ou um CEP com 8 dígitos.',erro:'Sugestões indisponíveis. Continue digitando o endereço.',fechado:'',pronto:`${itens.length} sugestões. Use as setas para escolher.`})[estado];
      itens.forEach((item,i)=>{const li=doc.createElement('li');li.id=lista.id+'-'+i;li.setAttribute('role','option');li.setAttribute('aria-selected','false');const nome=doc.createElement('strong'),detalhe=doc.createElement('span');nome.textContent=item.nome;detalhe.textContent=item.subtitulo;li.append(nome,detalhe);
        li.addEventListener('pointerdown',e=>e.preventDefault());li.addEventListener('click',()=>selecionar(item));lista.append(li);});
    }
    const controle=criarControleEndereco({buscar,atualizar,relogio:ambiente,vies:()=>{
      const lat=Number(input.dataset.enderecoLat),lon=Number(input.dataset.enderecoLon);
      return input.dataset.enderecoLat!==undefined&&input.dataset.enderecoLon!==undefined&&Number.isFinite(lat)&&Number.isFinite(lon)?{latitude:lat,longitude:lon}:null;
    }});
    input.addEventListener('input',()=>{if(!compondo)controle.digitar(input.value);});
    input.addEventListener('compositionstart',()=>{compondo=true;fechar();});input.addEventListener('compositionend',()=>{compondo=false;controle.digitar(input.value);});
    input.addEventListener('keydown',e=>{
      if(e.isComposing||compondo)return;
      if(e.key==='Escape'||e.key==='Tab'){fechar();return;}
      if(e.key==='Enter'){if(ativo>=0&&!lista.hidden){e.preventDefault();selecionar(itens[ativo]);}else fechar();return;}
      if(!lista.hidden&&['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();ativo=ativo<0?(e.key==='ArrowDown'?0:itens.length-1):(ativo+(e.key==='ArrowDown'?1:-1)+itens.length)%itens.length;
        Array.from(lista.children).forEach((li,i)=>li.setAttribute('aria-selected',String(i===ativo)));input.setAttribute('aria-activedescendant',lista.children[ativo].id);lista.children[ativo].scrollIntoView({block:'nearest'});}
    });
    input.addEventListener('blur',fechar);doc.addEventListener('pointerdown',e=>{if(!caixa.contains(e.target))fechar();});
    input.form?.addEventListener('reset',fechar);
    campos.set(input,{buscar:async()=>{const resultados=await controle.executar(input.value);if(resultados[0])selecionar(resultados[0]);}});
  }
  function atualizar(){doc.querySelectorAll('input[data-autocomplete-endereco]').forEach(conectar);}
  atualizar();
  if(ambiente.MutationObserver)new ambiente.MutationObserver(atualizar).observe(doc.body,{childList:true,subtree:true});
  return {buscar:input=>campos.get(input)?.buscar(),consultarCep:consultarViaCep,localizarCadastro:localizarEnderecoCadastro,reverter:reverterEndereco};
}
if(typeof module!=='undefined')module.exports={normalizarBuscaEndereco,identificarCepEndereco,consultarViaCep,localizarEnderecoCadastro,consultarProvedorEndereco,formatarEnderecosPhoton,reverterEndereco,criarServicoEnderecos,criarControleEndereco,iniciarEnderecos};
else window.Enderecos=iniciarEnderecos(document,window);
