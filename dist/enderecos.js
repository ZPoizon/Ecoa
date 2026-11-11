/* Photon público: uso razoável, sem cota numérica garantida. Uso intenso pode
 * sofrer bloqueio; sem SLA. Para escala, trocar provedor ou hospedar instância.
 * https://github.com/komoot/photon#demo-server — consultado em 11/11/2026.
 */
const ufsEndereco={'Acre':'AC','Alagoas':'AL','Amapá':'AP','Amazonas':'AM','Bahia':'BA','Ceará':'CE','Distrito Federal':'DF','Espírito Santo':'ES','Goiás':'GO','Maranhão':'MA','Mato Grosso':'MT','Mato Grosso do Sul':'MS','Minas Gerais':'MG','Pará':'PA','Paraíba':'PB','Paraná':'PR','Pernambuco':'PE','Piauí':'PI','Rio de Janeiro':'RJ','Rio Grande do Norte':'RN','Rio Grande do Sul':'RS','Rondônia':'RO','Roraima':'RR','Santa Catarina':'SC','São Paulo':'SP','Sergipe':'SE','Tocantins':'TO'};
// Único adaptador do provedor: retorna o formato interno, independente do Photon.
async function consultarProvedorEndereco(consulta,{signal,vies,fetcher=globalThis.fetch}={}) {
  const url=new URL('https://photon.komoot.io/api/');
  url.searchParams.set('q',consulta);url.searchParams.set('lang','pt');url.searchParams.set('limit','5');
  const centro=vies||{latitude:-14.2,longitude:-51.9};
  url.searchParams.set('lat',String(centro.latitude));url.searchParams.set('lon',String(centro.longitude));
  // Brasil primeiro, sem excluir endereços de outros países.
  const resposta=await fetcher(url.href,{signal,cache:'no-store',credentials:'omit'});
  if(!resposta.ok)throw Error('Serviço de endereços indisponível');
  const dados=await resposta.json();if(!Array.isArray(dados.features))throw Error('Resposta inválida');
  const texto=x=>typeof x==='string'?x.slice(0,300):'';
  return dados.features.map(f=>{
    const p=f.properties||{},coordenadas=f.geometry?.coordinates;
    if(!Array.isArray(coordenadas)||!Number.isFinite(coordenadas[0])||!Number.isFinite(coordenadas[1])||Math.abs(coordenadas[0])>180||Math.abs(coordenadas[1])>90)return null;
    const nome=texto(p.name)||texto(p.street)||texto(p.city)||texto(p.state);
    const rua=[texto(p.street),texto(p.housenumber)].filter(Boolean).join(', ');
    const bairro=texto(p.district)||texto(p.suburb)||texto(p.locality);
    const cidade=texto(p.city)||texto(p.town)||texto(p.village)||texto(p.county);
    const uf=ufsEndereco[texto(p.state)]||texto(p.state);
    const cidadeUF=[cidade,uf].filter(Boolean).join('/');
    const titulo=rua&&rua!==nome?`${nome} · ${rua}`:nome;
    const subtitulo=[bairro,cidadeUF, String(p.countrycode).toUpperCase()==='BR'?'':texto(p.country)].filter(Boolean).join(' · ');
    return nome?{nome:titulo,bairro,cidade,uf,cidadeUF,rotulo:[titulo,subtitulo].filter(Boolean).join(' — '),subtitulo,latitude:coordenadas[1],longitude:coordenadas[0],brasil:String(p.countrycode).toUpperCase()==='BR'}:null;
  }).filter(Boolean).sort((a,b)=>Number(b.brasil)-Number(a.brasil)).slice(0,5);
}
function criarServicoEnderecos(provedor=consultarProvedorEndereco) {
  const cache=new Map();
  return async function buscar(consulta,opcoes={}) {
    consulta=consulta.trim();if(consulta.length<3)return [];
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
    function posicionarLista(){
      if(lista.hidden)return;
      const r=input.getBoundingClientRect(),altura=ambiente.innerHeight,largura=ambiente.innerWidth;
      const abaixo=altura-r.bottom-8,acima=r.top-8,subir=abaixo<180&&acima>abaixo;
      lista.style.position='fixed';lista.style.left=Math.max(8,r.left)+'px';lista.style.width=Math.max(0,Math.min(r.width,largura-16))+'px';lista.style.right='auto';
      lista.style.top=subir?'auto':Math.max(8,r.bottom)+'px';lista.style.bottom=subir?Math.max(8,altura-r.top)+'px':'auto';
      lista.style.maxHeight=Math.max(0,Math.min(288,subir?acima:abaixo))+'px';
    }
    ambiente.addEventListener('resize',posicionarLista);doc.addEventListener('scroll',posicionarLista,true);
    function atualizar(estado,resultados){itens=resultados;ativo=-1;lista.replaceChildren();input.removeAttribute('aria-activedescendant');lista.hidden=estado!=='pronto';input.setAttribute('aria-expanded',String(!lista.hidden));
      status.textContent=({carregando:'Buscando endereços…',vazio:'Nenhum endereço encontrado. Você pode digitar livremente.',erro:'Sugestões indisponíveis. Continue digitando o endereço.',fechado:'',pronto:`${itens.length} sugestões. Use as setas para escolher.`})[estado];
      itens.forEach((item,i)=>{const li=doc.createElement('li');li.id=lista.id+'-'+i;li.setAttribute('role','option');li.setAttribute('aria-selected','false');const nome=doc.createElement('strong'),detalhe=doc.createElement('span');nome.textContent=item.nome;detalhe.textContent=item.subtitulo;li.append(nome,detalhe);
        li.addEventListener('pointerdown',e=>e.preventDefault());li.addEventListener('click',()=>selecionar(item));lista.append(li);});posicionarLista();
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
  return {buscar:input=>campos.get(input)?.buscar()};
}
if(typeof module!=='undefined')module.exports={consultarProvedorEndereco,criarServicoEnderecos,criarControleEndereco,iniciarEnderecos};
else window.Enderecos=iniciarEnderecos(document,window);
