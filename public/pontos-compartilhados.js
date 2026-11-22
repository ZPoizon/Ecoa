// Adaptador REST do Supabase: sem SDK, sem HTML e sem chave privilegiada.
const categoriasCompartilhadas=['reciclagem','doacao','agua','horta','oleo-de-cozinha','pilhas-eletronicos','outro'];
function normalizarPontoBusca(t){return String(t).normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim();}
function categoriaBanco(c){return ({verde:'horta',outros:'outro'})[c]||c;}
function montarConsultaPontos(config,{cidade='',uf='',categoria='',nome='',bbox}={}){
 const url=new URL('/rest/v1/pontos',config.SUPABASE_URL);
 if(url.protocol!=='https:')throw Error('Configuração inválida');
 url.searchParams.set('select','id,nome,categoria,cidade,uf,bairro,endereco,descricao,horario,aceita,telefone,site,lat,lng,status,verificado');
 url.searchParams.set('status','eq.aprovado');url.searchParams.set('order','verificado.desc,nome.asc,id.asc');url.searchParams.set('limit','200');
 if(categoria){if(!categoriasCompartilhadas.includes(categoriaBanco(categoria)))throw Error('Categoria inválida');url.searchParams.set('categoria','eq.'+categoriaBanco(categoria));}
 if(cidade){url.searchParams.set('cidade_busca','eq.'+normalizarPontoBusca(cidade).slice(0,100));if(uf)url.searchParams.set('uf','eq.'+uf);}
 else if(bbox){
  if(bbox.length!==4||!bbox.every(Number.isFinite)||bbox[0]>=bbox[2]||bbox[1]>=bbox[3]||Math.abs(bbox[0])>90||Math.abs(bbox[2])>90||Math.abs(bbox[1])>180||Math.abs(bbox[3])>180)throw Error('Área inválida');
  url.searchParams.append('lat','gte.'+bbox[0]);url.searchParams.append('lat','lte.'+bbox[2]);url.searchParams.append('lng','gte.'+bbox[1]);url.searchParams.append('lng','lte.'+bbox[3]);
 }
 // Remove metacaracteres do padrão; URLSearchParams impede injeção de filtros.
 const termo=normalizarPontoBusca(nome).replace(/[%_*\\]/g,'').slice(0,120);
 if(termo)url.searchParams.set('nome_busca','ilike.*'+termo+'*');
 return url;
}
function converterPontosCompartilhados(dados){
 if(!Array.isArray(dados))throw Error('Resposta inválida');
 const texto=(v,n)=>typeof v==='string'?v.slice(0,n):'';
 return dados.flatMap(p=>{
  if(p?.status!=='aprovado'||typeof p.id!=='string'||!categoriasCompartilhadas.includes(p.categoria)||!Number.isFinite(p.lat)||!Number.isFinite(p.lng)||Math.abs(p.lat)>90||Math.abs(p.lng)>180||typeof p.nome!=='string'||!p.nome.trim()||p.nome.startsWith('EXEMPLO'))return [];
  return [{id:'supabase-'+p.id,bancoId:p.id,nome:texto(p.nome,120),categoria:p.categoria,cidade:texto(p.cidade,100),UF:texto(p.uf,2),bairro:texto(p.bairro,100),endereco:texto(p.endereco,240),descricao:texto(p.descricao,600),horario:texto(p.horario,200),aceita:texto(p.aceita,300),telefone:texto(p.telefone,40),site:texto(p.site,500),latitude:p.lat,longitude:p.lng,verificado:p.verificado===true,origem:'supabase'}];
 });
}
function filtrarPontosCompartilhados(lista,{cidade='',uf='',nome=''}={}){
 const termo=normalizarPontoBusca(nome).replace(/[%_*\\]/g,'');
 return lista.filter(p=>(!cidade||normalizarPontoBusca(p.cidade||'')===normalizarPontoBusca(cidade))&&(!cidade||!uf||p.UF===uf)&&(!termo||normalizarPontoBusca(p.nome).includes(termo)));
}
function criarClientePontosCompartilhados(config,{fetcher=fetch}={}){
 async function obter(url,{signal}={}){
  const controle=new AbortController(),cancelar=()=>controle.abort();
  if(signal?.aborted)throw new DOMException('Cancelado','AbortError');
  signal?.addEventListener('abort',cancelar,{once:true});const timer=setTimeout(cancelar,10000);
  try{
   // Publishable não é JWT: só apikey, sem Authorization Bearer inválido.
   const resposta=await fetcher(url,{headers:{apikey:config.SUPABASE_ANON_KEY},signal:controle.signal,cache:'no-store',credentials:'omit'});
   if(!resposta.ok)throw Error('Pontos compartilhados indisponíveis');return await resposta.json();
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancelar);}
 }
 return {
  async consultar(filtros,opcoes){return converterPontosCompartilhados(await obter(montarConsultaPontos(config,filtros),opcoes));},
  async cidades(opcoes){const dados=await obter(new URL('/rest/v1/rpc/cidades_pontos',config.SUPABASE_URL),opcoes);if(!Array.isArray(dados))throw Error('Resposta inválida');return dados.filter(p=>typeof p.cidade==='string'&&p.cidade.length<=100&&/^[A-Z]{2}$/.test(p.uf));}
 };
}
const apiCompartilhados={categoriasCompartilhadas,normalizarPontoBusca,categoriaBanco,montarConsultaPontos,converterPontosCompartilhados,filtrarPontosCompartilhados,criarClientePontosCompartilhados};
if(typeof module!=='undefined')module.exports=apiCompartilhados;else window.EcoaCompartilhados=apiCompartilhados;
