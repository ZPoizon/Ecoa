// Integra mapa, lista, cartão e filtros. Um único estado de busca decide o escopo:
// cidade escolhida ou área visível. Cada fonte tem ID de requisição próprio; uma
// resposta antiga nunca substitui a região atual nem apaga outra fonte.
function iniciarPontosOSM(doc,ambiente,api) {
  const $=id=>doc.getElementById(id),criar=(tag,texto)=>{const e=doc.createElement(tag);if(texto!==undefined)e.textContent=String(texto);return e;};
  const categoriasComuns=typeof module!=='undefined'?require('./categorias-pontos'):window.EcoaCategoriasPontos;
  const LIMITE_VISIVEIS=200;
  const normalizar=texto=>String(texto||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim().replace(/\s+/g,' ');
  const agendar=(fn,ms)=>(ambiente.setTimeout||((f,t)=>setTimeout(f,t)))(fn,ms);
  const desagendar=id=>(ambiente.clearTimeout||clearTimeout)(id);
  const online=()=>ambiente.navigator.onLine!==false;
  const bbox=()=>{if(!mapa)return null;const b=mapa.getBounds();return [b.getSouth(),b.getWest(),b.getNorth(),b.getEast()];};
  const chaveArea=()=>{const b=bbox();return JSON.stringify(['area',...(b||[]).map(n=>Number(n).toFixed(3))]);};
  const chaveAtual=()=>estado.modo==='cidade'
    ? JSON.stringify(['cidade',normalizar(estado.regiao?.cidade),String(estado.regiao?.uf||'').toUpperCase()])
    : chaveArea();

  const estado={
    modo:'area',regiao:null,categoria:'',termo:'',versao:0,selecionado:null,cobertura:null,visiveis:[],
    fontes:{
      osm:{id:0,status:'idle',erro:'',chave:'',versao:0,controle:null,timer:null,limite:false,origemCache:false},
      banco:{id:0,status:'idle',erro:'',chave:'',versao:0,controle:null,timer:null,limite:false,origemCache:false},
      base:{id:0,status:'idle',erro:'',chave:'',versao:0,controle:null,timer:null,limite:false,origemCache:false}
    },
    dados:{fixos:[],salvos:[],osm:new Map(),banco:new Map(),base:new Map()}
  };
  let mapa,camada,ativo=false,basePronta=false,buscaConectada=false;
  let posicaoPendente,focoAnteriorCartao,cartaoPonto,ultimoMarcador;
  let programaMovimento=0,movimentoProgramatico=false,ultimaArea='';
  let promessaCidades=null,cidadesEm=0;
  const marcadores=new Map(),itensLista=new WeakMap();

  // A denúncia permanece: é a única comunicação sobre pontos já publicados.
  const cadastroAPI=ambiente.EcoaCadastroPontos||(typeof module!=='undefined'?require('./cadastro-pontos'):window.EcoaCadastroPontos);
  let armazenamentoEnvios;try{armazenamentoEnvios=ambiente.localStorage;}catch{}
  const envios=cadastroAPI?.criarEnviosPontos?.(ambiente.EcoaConfig||{},{
    fetcher:ambiente.fetch.bind(ambiente),storage:armazenamentoEnvios,locks:ambiente.navigator?.locks
  });
  let denunciando=false,pontoDenuncia=null;

  const gerenteBases=ambiente.EcoaBasesRegiao?.criarGerenciadorBasesRegiao?.({
    fetcher:ambiente.fetch.bind(ambiente),storage:ambiente.sessionStorage
  })||null;
  const compartilhadoAPI=ambiente.EcoaCompartilhados;
  const config=ambiente.EcoaConfig||{};
  const clienteBanco=compartilhadoAPI&&ambiente.EcoaConfig?compartilhadoAPI.criarClientePontosCompartilhados(config,{fetcher:ambiente.fetch.bind(ambiente)}):null;
  let cacheBanco=null;
  try{cacheBanco=ambiente.EcoaPontosCache?.criarCachePontos?.(config,{storage:ambiente.localStorage})||null;}catch{}
  let storage;try{storage=ambiente.sessionStorage;}catch{}
  const cliente=api.criarClienteOSM({fetcher:ambiente.fetch.bind(ambiente),storage});

  function rotuloCidade(){const r=estado.regiao;return estado.modo==='cidade'&&r?[r.cidade,r.uf].filter(Boolean).join('/'):'';}
  function rotuloAbrangencia(){
    const cobertura=estado.cobertura?.entrada;
    return cobertura?.abrangencia==='cidade e arredores'?`${rotuloCidade()} e arredores`:rotuloCidade();
  }
  function atualizarIndicador(){
    const ajuda=$('osm-filtro-ajuda');if(!ajuda)return;
    if(estado.modo==='cidade'){
      const cobertura=estado.cobertura?.entrada;
      ajuda.textContent=`Mostrando a região de ${rotuloAbrangencia()}. ${cobertura
        ? `Base importada: ${cobertura.quantidade} registros válidos em ${cobertura.abrangencia==='cidade e arredores'?'cidade e arredores':'município'}, gerada em ${cobertura.geradoEm||'data não informada'}${estado.cobertura.origemCache?' (cópia salva)':''}.`
        : estado.cobertura?.erro ? 'Não conseguimos atualizar a base importada desta cidade.' : 'Ainda não há base importada para esta cidade; a consulta usa os pontos aprovados e a região escolhida.'} A categoria escolhida continua ativa. Arrastar o mapa passa a consultar a área visível.`;
    }else{
      ajuda.textContent=`Mostrando a área visível do mapa${estado.termo?` (busca: ${estado.termo})`:''}. A categoria escolhida continua ativa. Navegar no mapa consulta a nova área.`;
    }
    const texto=$('osm-vazio-texto');if(texto)texto.textContent='Nenhum local encontrado com estes filtros.';
  }
  function sincronizarStatus(){
    const fontes=Object.values(estado.fontes);
    const carregando=fontes.some(f=>f.status==='carregando');
    const erros=fontes.filter(f=>f.status==='erro');
    const limite=estado.fontes.banco.limite||estado.fontes.osm.limite;
    const emCache=fontes.some(f=>f.origemCache);
    let texto;
    if(carregando&&!estado.visiveis.length)texto='Buscando locais nesta região…';
    else if(carregando&&emCache)texto='Mostrando pontos salvos · Buscando locais nesta região…';
    else if(!estado.visiveis.length&&erros.length)texto='Não conseguimos atualizar agora.';
    else if(!estado.visiveis.length)texto='Nenhum local encontrado com estes filtros.';
    else if(!online()||erros.length||emCache)texto='Mostrando pontos salvos';
    else if(limite)texto='Exibindo até 200 pontos; aproxime ou limpe os filtros.';
    else texto=`${estado.visiveis.length} ${estado.visiveis.length===1?'ponto encontrado':'pontos encontrados'}.`;
    if($('osm-status'))$('osm-status').textContent=texto;
    if($('osm-lista'))$('osm-lista').setAttribute('aria-busy',String(carregando));
    const vazio=$('osm-vazio');
    if(vazio)vazio.hidden=estado.visiveis.length>0||carregando;
    if($('osm-tentar'))$('osm-tentar').hidden=!(erros.length||!online());
    if($('osm-vazio-ampliar'))$('osm-vazio-ampliar').hidden=!mapa;
    if($('osm-banco-status')){
      const f=estado.fontes.banco;
      $('osm-banco-status').textContent=f.status==='erro'
        ? (estado.visiveis.length?'Não conseguimos atualizar agora. Mostrando pontos salvos':'Não conseguimos atualizar agora.')
        : f.origemCache||!online()?'Mostrando pontos salvos':'';
    }
  }
  function pontoNoEscopo(p){
    if(!p||!Number.isFinite(p.latitude)||!Number.isFinite(p.longitude))return false;
    if(estado.selecionado&&estado.selecionado.id===p.id)return true;
    // A categoria escolhida filtra todas as fontes, inclusive base importada e
    // pontos salvos; sem isso chips e lista mostravam conjuntos diferentes.
    if(estado.categoria&&api.categoriaMapaOSM(p.categoria)!==estado.categoria)return false;
    const r=estado.regiao;if(!r)return false;
    if(estado.modo==='cidade'){
      if(p.idBaseCidade&&r.idBase&&p.idBaseCidade===r.idBase)return true;
      if(normalizar(p.cidade||'')!==normalizar(r.cidade))return false;
      return !r.uf||!p.UF||String(p.UF).toUpperCase()===r.uf;
    }
    return api.dentroAreaOSM(p,bbox());
  }
  function filtrosBanco(){
    return estado.modo==='cidade'
      ? {categoria:estado.categoria,uf:estado.regiao?.uf,cidade:estado.regiao?.cidade}
      : {categoria:estado.categoria,bbox:bbox()};
  }
  function registrarPontos(fonte,chave,lista){
    const mapaFonte=estado.dados[fonte];if(!mapaFonte)return;
    for(const [id,item] of [...mapaFonte])if(item.chaveRegiao===chave)mapaFonte.delete(id);
    const origem=fonte==='banco'?'supabase':fonte==='base'?'base':'osm';
    for(const p of Array.isArray(lista)?lista:[]){
      if(!p||typeof p.id!=='string'||!Number.isFinite(p.latitude)||!Number.isFinite(p.longitude))continue;
      mapaFonte.set(p.id,{...p,origem:p.origem||origem,chaveRegiao:chave});
    }
    while(mapaFonte.size>600)mapaFonte.delete(mapaFonte.keys().next().value);
  }
  function visiveisAgora(){
    const candidatos=[
      ...estado.dados.fixos,...estado.dados.salvos,
      ...estado.dados.osm.values(),...estado.dados.banco.values(),...estado.dados.base.values()
    ];
    if(estado.selecionado&&!candidatos.some(p=>p.id===estado.selecionado.id))candidatos.unshift(estado.selecionado);
    const emEscopo=candidatos.filter(pontoNoEscopo);
    const mesclados=api.mesclarPontosOSM([],emEscopo);
    return mesclados.length>LIMITE_VISIVEIS?mesclados.slice(0,LIMITE_VISIVEIS):mesclados;
  }
  function cancelarRequisicao(fonte){
    const f=estado.fontes[fonte];f.id++;desagendar(f.timer);f.controle?.abort();f.timer=null;f.controle=null;
    if(f.status==='carregando')f.status='idle';
  }
  function cancelarTudo(){for(const fonte of Object.keys(estado.fontes))cancelarRequisicao(fonte);}
  function iniciarRequisicao(fonte,chave,forcar){
    const f=estado.fontes[fonte];
    if(!forcar&&f.chave===chave&&(f.status==='carregando'||f.status==='ok'))return null;
    cancelarRequisicao(fonte);
    f.id++;f.chave=chave;f.versao=estado.versao;f.status='carregando';f.erro='';f.limite=false;f.origemCache=false;
    return f.id;
  }
  function reqValida(fonte,id,chave,versao){
    const f=estado.fontes[fonte];
    return f.id===id&&f.chave===chave&&f.versao===versao;
  }
  function fecharCartao(devolverFoco=false){
    if(!$('ponto-cartao')||$('ponto-cartao').hidden)return;
    $('ponto-cartao').hidden=true;$('ponto-cartao-conteudo').replaceChildren();
    cartaoPonto=null;
    if(devolverFoco){
      const marcador=ultimoMarcador?.getElement?.();
      if(marcador?.isConnected&&typeof marcador.focus==='function')marcador.focus();
      else if(focoAnteriorCartao?.isConnected&&typeof focoAnteriorCartao.focus==='function')focoAnteriorCartao.focus();
    }
    focoAnteriorCartao=null;
  }
  function destacar(marker){
    for(const m of marcadores.values())m?.getElement?.()?.classList?.remove?.('osm-marker--selecionado');
    marker?.getElement?.()?.classList?.add?.('osm-marker--selecionado');
  }
  function renderizar(){
    estado.visiveis=visiveisAgora();
    $('osm-lista').replaceChildren();camada?.clearLayers();marcadores.clear();
    for(const p of estado.visiveis){
      const item=criar('li');item.tabIndex=-1;item.className='osm-card';itensLista.set(item,p);
      const botoes=api.preencherCartaoPonto(doc,item,p);
      if(camada){
        const icon=ambiente.L.divIcon({className:'osm-marker',html:'<span aria-hidden="true">●</span>',iconSize:[44,44],iconAnchor:[22,22]});
        const marker=ambiente.L.marker([p.latitude,p.longitude],{icon,title:p.nome,alt:p.nome,keyboard:true}).addTo(camada);
        marcadores.set(p.id,marker);
        marker.on('click',()=>abrirCartao(p,marker));
        const ver=criar('button','Ver detalhes');ver.type='button';
        ver.addEventListener('click',()=>selecionar(item,marker));botoes?.prepend(ver);
      }
      if(p.origem==='supabase'&&p.bancoId){
        const denunciar=criar('button','Denunciar ponto');denunciar.type='button';denunciar.className='secondary';
        denunciar.addEventListener('click',()=>denunciarPonto(p));botoes?.append(denunciar);
      }
      $('osm-lista').append(item);
    }
    if(cartaoPonto&&!estado.visiveis.some(x=>x.id===cartaoPonto.id))fecharCartao();
    else if(cartaoPonto)destacar(marcadores.get(cartaoPonto.id));
    sincronizarStatus();
  }
  function abrirCartao(p,marker){
    if(!p||!$('ponto-cartao')||!$('ponto-cartao-conteudo'))return;
    const anterior=doc.activeElement,util=anterior&&anterior!==doc.body?anterior:$('cidade-busca-unica');
    if(util&&util!==$('ponto-cartao-titulo'))focoAnteriorCartao=util;
    cartaoPonto=p;ultimoMarcador=marker||null;
    const conteudo=$('ponto-cartao-conteudo');conteudo.replaceChildren();
    $('ponto-cartao-titulo').textContent=String(p.nome);
    const planoPontos=ambiente.EcoaPlanoPontos||(typeof window!=='undefined'?window.EcoaPlanoPontos:null);
    const acoesPontos=ambiente.EcoaAcoesPontos||(typeof window!=='undefined'?window.EcoaAcoesPontos:null);
    const opcoesCartao={detalhado:true};
    if(planoPontos&&acoesPontos?.sugestaoAcaoPonto){
      const sugestao=acoesPontos.sugestaoAcaoPonto(p);
      if(sugestao?.acao){
        opcoesCartao.acaoSalva=!!planoPontos.contemAcaoPlano?.(sugestao.acao);
        opcoesCartao.aoSalvarAcao=(sugestaoAtual,ponto)=>planoPontos.salvarAcaoDoPonto(sugestaoAtual?.acao,ponto)?.salva===true;
        opcoesCartao.aoVerPlano=()=>{
          const roteador=ambiente.EcoaRouter||(typeof window!=='undefined'?window.EcoaRouter:null);
          roteador?.navegar?.('#/meu-espaco');
        };
      }
    }
    const acoes=api.preencherCartaoPonto(doc,conteudo,p,opcoesCartao);
    if(p.origem==='supabase'&&p.bancoId){
      const denunciar=criar('button','Denunciar este ponto');denunciar.type='button';denunciar.className='secondary';
      denunciar.addEventListener('click',()=>denunciarPonto(p));acoes.append(denunciar);
    }
    destacar(marker);
    const painel=$('ponto-cartao');painel.hidden=false;
    $('ponto-cartao-titulo').focus?.({preventScroll:true});
    const altura=ambiente.innerHeight||globalThis.innerHeight||0;
    if(typeof painel.getBoundingClientRect==='function'&&altura){
      const r=painel.getBoundingClientRect();
      if(r.top<0||r.bottom>altura)painel.scrollIntoView?.({block:'center'});
    }else painel.scrollIntoView?.({block:'center'});
  }
  function selecionar(item,marker){
    for(const el of $('osm-lista').children)el.removeAttribute?.('data-selecionado');
    item.dataset.selecionado='true';item.focus({preventScroll:true});
    abrirCartao(itensLista.get(item),marker);
  }
  function agendarOSM({forcar=false}={}){
    const f=estado.fontes.osm,chave=chaveAtual();
    if(!estado.categoria||!mapa||!online()){if(f.status!=='idle'){f.status='idle';sincronizarStatus();}return;}
    if(typeof mapa.getZoom==='function'&&mapa.getZoom()<13){f.status='idle';sincronizarStatus();return;}
    const id=iniciarRequisicao('osm',chave,forcar);if(id===null)return;
    const versao=estado.versao,b=bbox(),controle=new AbortController();f.controle=controle;
    f.timer=agendar(async()=>{
      if(!reqValida('osm',id,chave,versao))return;
      try{
        const lista=await cliente.consultar(estado.categoria,b,{signal:controle.signal,forcar});
        if(!reqValida('osm',id,chave,versao))return;
        registrarPontos('osm',chave,lista);f.status='ok';f.erro='';renderizar();
      }catch(e){
        if(reqValida('osm',id,chave,versao)&&e.name!=='AbortError'){f.status='erro';f.erro=String(e.message||e);renderizar();}
      }
    },600);
    sincronizarStatus();
  }
  function agendarBanco({forcar=false}={}){
    const f=estado.fontes.banco,chave=chaveAtual();
    if(!clienteBanco||!basePronta||!ativo){if(f.status!=='idle'){f.status='idle';sincronizarStatus();}return;}
    const filtros=filtrosBanco();
    const id=iniciarRequisicao('banco',chave,forcar);if(id===null)return;
    const versao=estado.versao;
    let emCache=null;
    if(!forcar){
      try{emCache=cacheBanco?.ler(filtros)||null;}catch{}
      if(emCache){registrarPontos('banco',chave,emCache);f.origemCache=true;renderizar();}
    }
    if(!online()){f.status=emCache?'ok':'erro';if(!emCache)f.erro='offline';renderizar();return;}
    const controle=new AbortController();f.controle=controle;
    f.timer=agendar(async()=>{
      if(!reqValida('banco',id,chave,versao))return;
      try{
        const resposta=clienteBanco.consultarComLimite
          ?await clienteBanco.consultarComLimite({...filtros,limite:200},{signal:controle.signal})
          :{pontos:await clienteBanco.consultar(filtros,{signal:controle.signal}),limiteAtingido:false};
        if(!reqValida('banco',id,chave,versao))return;
        registrarPontos('banco',chave,resposta.pontos);
        f.limite=!!resposta.limiteAtingido;f.status='ok';f.erro='';f.origemCache=false;
        if(!forcar){try{cacheBanco?.gravar(filtros,resposta.pontos);}catch{}}
        renderizar();
      }catch(e){
        if(reqValida('banco',id,chave,versao)&&e.name!=='AbortError'){f.status='erro';f.erro=String(e.message||e);renderizar();}
      }
    },600);
    sincronizarStatus();
  }
  async function carregarBase({forcar=false}={}){
    const f=estado.fontes.base,chave=chaveAtual();
    if(estado.modo!=='cidade'||!gerenteBases){if(f.status!=='idle'){f.status='idle';sincronizarStatus();}return;}
    if(!forcar&&f.chave===chave&&(f.status==='ok'||f.status==='erro'))return;
    const id=iniciarRequisicao('base',chave,forcar);if(id===null)return;
    const versao=estado.versao,r=estado.regiao;
    try{
      await gerenteBases.listar();
      const entrada=gerenteBases.encontrar(r.cidade,r.uf);
      if(!reqValida('base',id,chave,versao))return;
      r.idBase=entrada?.id||null;
      if(!entrada){estado.cobertura={entrada:null};f.status='ok';f.erro='';renderizar();return;}
      const base=await gerenteBases.carregar(entrada.id,{revalidar:forcar});
      if(!reqValida('base',id,chave,versao))return;
      registrarPontos('base',chave,base.pontos);
      estado.cobertura={entrada,origemCache:!!base.origemCache,quantidade:base.pontos.length};
      f.status='ok';f.erro='';f.origemCache=!!base.origemCache;renderizar();atualizarIndicador();
    }catch(e){
      if(!reqValida('base',id,chave,versao))return;
      estado.cobertura={entrada:null,erro:true};f.status='erro';f.erro=String(e.message||e);renderizar();atualizarIndicador();
    }
  }
  function atualizar({forcar=false}={}){
    if(!ativo)return;
    renderizar();
    if(!online()){agendarBanco({forcar});if(estado.modo==='cidade')carregarBase({forcar});sincronizarStatus();return;}
    if(!mapa||!basePronta){sincronizarStatus();return;}
    agendarBanco({forcar});agendarOSM({forcar});
    if(estado.modo==='cidade')carregarBase({forcar});
    sincronizarStatus();
  }
  function moverProgramatico(fn){
    programaMovimento++;
    try{return fn();}finally{agendar(()=>{programaMovimento=Math.max(0,programaMovimento-1);},0);}
  }
  function conectar(m){
    mapa=m;camada=ambiente.L.layerGroup().addTo(mapa);ultimaArea=chaveArea();
    // O primeiro carregamento do mapa já define a área consultada; sem isso a lista
    // ficaria vazia até o primeiro arraste, mesmo com respostas válidas.
    if(!estado.regiao)definirArea(null,null,{manterSelecionado:false});
    mapa.on('dragstart',()=>cancelarTudo());
    mapa.on('movestart',()=>{movimentoProgramatico=programaMovimento>0;});
    mapa.on('moveend',()=>{
      const programatico=programaMovimento>0||movimentoProgramatico;
      movimentoProgramatico=false;
      // Arraste do usuário troca o escopo: a cidade anterior não fica como filtro oculto.
      // Um moveend sem mudança de área apenas revalida a consulta atual.
      const chave=chaveArea();
      if(!programatico&&chave!==ultimaArea){ultimaArea=chave;definirArea(null,null,{manterSelecionado:false});}
      else atualizar();
    });
    if(posicaoPendente){
      moverProgramatico(()=>mapa.setView(posicaoPendente.pos,posicaoPendente.zoom||15,{animate:false}));
      posicaoPendente=null;
    }
    conectarBusca();atualizar();
  }
  categoriasComuns.preencherFiltrosCategoriaPontos(doc);
  for(const chip of doc.querySelectorAll('[data-categoria-osm]'))chip.addEventListener('click',()=>{
    estado.categoria=chip.dataset.categoriaOsm||'';ativo=true;
    if(estado.selecionado&&estado.categoria&&api.categoriaMapaOSM(estado.selecionado.categoria)!==estado.categoria){
      estado.selecionado=null;fecharCartao();
    }
    for(const c of doc.querySelectorAll('[data-categoria-osm]'))c.setAttribute('aria-pressed',String(c===chip));
    if($('osm-categoria-ajuda'))$('osm-categoria-ajuda').textContent=categoriasComuns.orientacaoCategoriaPontos(estado.categoria);
    atualizar({forcar:true});if(!mapa&&online())$('cidade-carregar').click();
  });
  function limparFiltros(){
    estado.categoria='';estado.termo='';estado.selecionado=null;fecharCartao();
    for(const c of doc.querySelectorAll('[data-categoria-osm]'))c.setAttribute('aria-pressed',String(!c.dataset.categoriaOsm));
    if($('osm-categoria-ajuda'))$('osm-categoria-ajuda').textContent=categoriasComuns.orientacaoCategoriaPontos('');
    if($('cidade-busca-unica'))$('cidade-busca-unica').value='';
    atualizarIndicador();atualizar({forcar:true});
  }
  function buscarOutraCidade(){
    const campo=$('cidade-busca-unica');if(!campo)return;
    campo.scrollIntoView?.({block:'center'});campo.focus?.();campo.select?.();
  }
  function ampliarArea(){
    if(!mapa)return;
    const zoom=typeof mapa.getZoom==='function'?mapa.getZoom():14;
    moverProgramatico(()=>mapa.setZoom?.(Math.max(1,zoom-2),{animate:false}));
    definirArea(null,null,{manterSelecionado:false});
  }
  $('osm-tentar').addEventListener('click',()=>atualizar({forcar:true}));
  $('osm-vazio-atualizar')?.addEventListener('click',()=>atualizar({forcar:true}));
  $('osm-vazio-limpar')?.addEventListener('click',limparFiltros);
  $('osm-vazio-cidade')?.addEventListener('click',buscarOutraCidade);
  $('osm-vazio-ampliar')?.addEventListener('click',ampliarArea);
  $('osm-perto').addEventListener('click',()=>{
    if(!ambiente.navigator.geolocation){if($('osm-status'))$('osm-status').textContent='Este navegador não oferece localização. Digite um lugar.';return;}
    $('osm-perto').disabled=true;if($('osm-status'))$('osm-status').textContent='Aguardando sua permissão de localização…';
    ambiente.navigator.geolocation.getCurrentPosition(p=>{
      $('osm-perto').disabled=false;const pos=[p.coords.latitude,p.coords.longitude];
      definirArea(pos,15,{termo:'Perto de mim'});
    },()=>{$('osm-perto').disabled=false;if($('osm-status'))$('osm-status').textContent='Não foi possível obter sua localização. Você pode digitar um lugar.';},{enableHighAccuracy:false,maximumAge:0,timeout:10000});
  });
  function definirArea(pos,zoom,{termo='',manterSelecionado=false}={}){
    estado.versao++;estado.modo='area';
    estado.regiao={tipo:'area',pos,zoom};estado.termo=termo;
    estado.cobertura=null;
    if(!manterSelecionado){estado.selecionado=null;fecharCartao();}
    cancelarTudo();
    if(pos&&mapa)moverProgramatico(()=>mapa.setView(pos,zoom||15,{animate:false}));
    else if(pos)posicaoPendente={pos,zoom:zoom||15};
    ultimaArea=chaveArea();
    atualizarIndicador();renderizar();atualizar();
  }
  function definirCidade(cidade,pos,zoom){
    const nome=String(cidade?.nome||'').trim().slice(0,100);if(!nome)return;
    estado.versao++;estado.modo='cidade';
    estado.regiao={tipo:'cidade',cidade:nome,uf:String(cidade.uf||'').toUpperCase(),idBase:null,pos,zoom};
    estado.termo=nome;estado.cobertura=null;estado.selecionado=null;fecharCartao();
    cancelarTudo();
    if(pos&&Number.isFinite(pos[0])&&Number.isFinite(pos[1])){
      if(mapa)moverProgramatico(()=>mapa.setView(pos,zoom||13,{animate:false}));
      else posicaoPendente={pos,zoom:zoom||13};
    }
    ultimaArea=chaveArea();
    atualizarIndicador();renderizar();atualizar();
  }
  function limparEscopoCidade(){if(estado.modo==='cidade'||estado.cobertura)definirArea(null,null,{});}
  function aoPonto(p){
    if(!p)return;
    estado.versao++;estado.modo='area';estado.regiao={tipo:'area',pos:[p.latitude,p.longitude],zoom:16};
    estado.termo=String(p.nome||'');estado.cobertura=null;estado.selecionado=p;
    cancelarTudo();
    const pos=[p.latitude,p.longitude];
    if(mapa)moverProgramatico(()=>mapa.setView(pos,16,{animate:false}));
    else posicaoPendente={pos,zoom:16};
    ultimaArea=chaveArea();
    atualizarIndicador();renderizar();abrirCartao(p);atualizar();
  }
  function aoEndereco(p){
    // origemCidade é sinal suficiente: bairro/CEP do geocodificador não desclassificam a cidade.
    const ehCidade=p?.origemCidade===true||(!!(p?.cidade&&p.uf)&&(!p.cep||!p.nome||normalizar(p.nome)===normalizar(p.cidade)));
    if(ehCidade&&Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)){
      definirCidade({nome:p.cidade,uf:p.uf,id:p.idBaseCidade},[p.latitude,p.longitude],13);return;
    }
    if(!Number.isFinite(p?.latitude)||!Number.isFinite(p?.longitude))return;
    definirArea([p.latitude,p.longitude],16,{termo:String(p.nome||p.cidade||'')});
  }
  function aoCidade(p){if(p?.cidade)definirCidade({nome:p.cidade,uf:p.uf},null,null);}
  async function listarCidades(termo){
    if(!clienteBanco)return [];
    const agora=Date.now();
    if(!promessaCidades||agora-cidadesEm>300000){
      cidadesEm=agora;
      promessaCidades=clienteBanco.cidades().catch(e=>{promessaCidades=null;cidadesEm=0;throw e;});
    }
    const cidades=await promessaCidades,alvo=normalizar(termo);
    return cidades.filter(c=>normalizar(c.cidade).includes(alvo)).slice(0,20);
  }
  function conectarBusca(){
    if(buscaConectada||!ambiente.EcoaBuscaCidade?.conectar)return;
    buscaConectada=true;
    ambiente.EcoaBuscaCidade.conectar({
      aoPonto,aoEndereco,aoCidade,
      vies:()=>{const c=mapa?.getCenter?.();return c?{latitude:c.lat,longitude:c.lng}:null;},
      buscarPontos:(termo,opcoes)=>clienteBanco?clienteBanco.consultar({nome:termo},{signal:opcoes?.signal}):[],
      buscarCidades:termo=>listarCidades(termo)
    });
  }
  function denunciarPonto(p){
    if(!envios||denunciando)return;
    pontoDenuncia=p;$('denuncia-enviar').disabled=false;
    $('denuncia-local').textContent=String(p?.nome||'');$('denuncia-status').textContent='';
    $('denuncia-form').reset?.();$('denuncia-dialogo').showModal?.();
  }
  $('denuncia-fechar')?.addEventListener('click',()=>$('denuncia-dialogo').close?.());
  $('denuncia-form')?.addEventListener('submit',async e=>{
    e.preventDefault();if(denunciando)return;denunciando=true;$('denuncia-enviar').disabled=true;
    try{
      if(ambiente.navigator.onLine===false)throw Error('Você está offline. Conecte-se para enviar a denúncia.');
      await envios.denunciar(pontoDenuncia?.bancoId,$('denuncia-motivo').value);
      $('denuncia-status').textContent='Recebemos a denúncia. O ponto será revisado.';pontoDenuncia=null;
    }catch(e){$('denuncia-status').textContent=e.message;}
    finally{denunciando=false;$('denuncia-enviar').disabled=!pontoDenuncia;if($('denuncia-dialogo').open)$('denuncia-status').focus?.();}
  });
  $('denuncia-dialogo')?.addEventListener('close',()=>{if(!denunciando)$('denuncia-enviar').disabled=false;});
  $('ponto-cartao-fechar')?.addEventListener('click',()=>fecharCartao(true));
  doc.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('ponto-cartao')&&!$('ponto-cartao').hidden){e.preventDefault();fecharCartao(true);}});
  doc.querySelector?.('.atalho-lista-teclado')?.addEventListener('click',()=>{
    const painel=$('lista-pontos-painel');if(painel)painel.open=true;
  });
  ambiente.addEventListener('offline',()=>atualizar());ambiente.addEventListener('online',()=>atualizar({forcar:true}));
  doc.addEventListener('ecoa-rota',e=>{
    ativo=e.detail.tela==='na-cidade';
    if(ativo){conectarBusca();atualizar();}
    else{cancelarTudo();fecharCartao();if($('denuncia-dialogo')?.open)$('denuncia-dialogo').close?.();}
  });
  const carregar=async(url,validar)=>{try{const r=await ambiente.fetch(url,{credentials:'same-origin'});if(!r.ok)throw Error();return validar(await r.json());}catch{return [];}};
  conectarBusca();atualizarIndicador();sincronizarStatus();
  const pronto=Promise.all([
    carregar('pontos-osm.json',api.validarBaseOSM).then(lista=>{estado.dados.salvos=lista;renderizar();}),
    carregar('pontos-fixos.json',api.validarFixosOSM).then(lista=>{estado.dados.fixos=lista;renderizar();})
  ]).then(()=>{basePronta=true;atualizar();});
  return {
    conectar,atualizar,pronto,abrirCartao,fecharCartao,denunciar:denunciarPonto,
    limparFiltros,buscarOutraCidade,ampliarArea,
    estado:()=>({
      modo:estado.modo,categoria:estado.categoria,termo:estado.termo,versao:estado.versao,
      regiao:estado.regiao?{...estado.regiao,chave:chaveAtual()}:null,
      requisicoes:Object.fromEntries(Object.entries(estado.fontes).map(([nome,f])=>[nome,{id:f.id,status:f.status,erro:f.erro,chave:f.chave,versao:f.versao}])),
      visiveis:estado.visiveis.length
    }),
    todos:()=>[...estado.dados.fixos,...estado.dados.salvos,...estado.dados.osm.values(),...estado.dados.banco.values(),...estado.dados.base.values()]
  };
}
if(typeof module!=='undefined')module.exports={iniciarPontosOSM};
else window.ecoaPontosMapa=iniciarPontosOSM(document,window,window.EcoaPontosOSM);
