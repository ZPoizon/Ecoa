/* Ecoa: provedores isolados. Servidores públicos compartilhados: consultas pequenas,
   uma categoria por vez; respeitar Retry-After e aguardar ao menos 30 s após 429.
   O navegador controla User-Agent; o comentário da consulta identifica o projeto. */
const categoriasOSM = {
  reciclagem: {nome:'Reciclagem', tags:[['amenity','recycling']]},
  doacao: {nome:'Doação', tags:[['shop','charity']]},
  agua: {nome:'Água potável', tags:[['amenity','drinking_water']]},
  verde: {nome:'Hortas e áreas verdes', tags:[['leisure','garden'],['leisure','park'],['landuse','allotments']]},
  outros: {nome:'Outros', tags:[['amenity','public_bookcase'],['amenity','community_centre']]}
};
categoriasOSM['oleo-de-cozinha']={nome:'Óleo de cozinha',tags:[['recycling:cooking_oil','yes']]};
categoriasOSM['pilhas-eletronicos']={nome:'Pilhas e eletrônicos',tags:[['recycling:batteries','yes'],['recycling:small_electrical_appliances','yes']]};
function categoriaMapaOSM(c){return ({horta:'verde',outro:'outros'})[c]||c;}
const servidoresOSM = ['https://overpass-api.de/api/interpreter','https://overpass.private.coffee/api/interpreter'];
const abortadoOSM = () => new DOMException('Cancelado','AbortError');
function areaOSM(b) {
  if(!Array.isArray(b)||b.length!==4||!b.every(Number.isFinite)||b[0]>=b[2]||b[1]>=b[3]||Math.abs(b[0])>90||Math.abs(b[2])>90||Math.abs(b[1])>180||Math.abs(b[3])>180) throw Error('Área inválida. Aproxime o mapa.');
  return b.map((v,i)=>(i<2?Math.floor(v*100):Math.ceil(v*100))/100);
}
function montarConsultaOSM(categoria,bbox) {
  if(!Object.hasOwn(categoriasOSM,categoria))throw Error('Escolha uma categoria.');
  const b=areaOSM(bbox);
  if(b[2]-b[0]>.3||b[3]-b[1]>.3)throw Error('Aproxime o mapa para ver pontos.');
  return `/* Ecoa - pontos na cidade */[out:json][timeout:45];(${categoriasOSM[categoria].tags.map(([k,v])=>`nwr["${k}"="${v}"](${b.join(',')});`).join('')});out center tags 200;`;
}
function pontoValidoOSM(p) {return p&&typeof p.id==='string'&&typeof p.nome==='string'&&Object.hasOwn(categoriasOSM,categoriaMapaOSM(p.categoria))&&Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)&&Math.abs(p.latitude)<=90&&Math.abs(p.longitude)<=180;}
function converterPontosOSM(dados,categoria) {
  if(!dados||!Array.isArray(dados.elements)||dados.remark)throw Error('Resposta incompleta do servidor.');
  const texto=v=>typeof v==='string'?v.slice(0,1000):'';
  return dados.elements.slice(0,200).flatMap(e=>{
    const t=e.tags||{},latitude=e.lat??e.center?.lat,longitude=e.lon??e.center?.lon;
    if(!['node','way','relation'].includes(e.type)||!Number.isSafeInteger(e.id))return [];
    const p={id:`osm-${e.type}-${e.id}`,nome:texto(t.name)||categoriasOSM[categoria].nome,categoria,latitude,longitude,
      endereco:[t['addr:street'],t['addr:housenumber'],t['addr:suburb']].map(texto).filter(Boolean).join(', '),cidade:texto(t['addr:city']),UF:texto(t['addr:state']),horario:texto(t.opening_hours),aceita:texto(t.description),telefone:texto(t.phone||t['contact:phone']),fonte:`https://www.openstreetmap.org/${e.type}/${e.id}`,origem:'osm',semNome:!texto(t.name)};
    return pontoValidoOSM(p)?[p]:[];
  });
}
function validarFixosOSM(dados) {
  if(!Array.isArray(dados))throw Error('Não foi possível ler os pontos verificados.');
  return dados.filter(p=>pontoValidoOSM(p)&&p.exemplo!==true&&p.nome.trim()&&/^https:\/\//.test(p.fonte||'')&&/^\d{4}-\d{2}-\d{2}$/.test(p.dataVerificacao||'')&&!Number.isNaN(Date.parse(p.dataVerificacao))&&new Date(p.dataVerificacao).toISOString().slice(0,10)===p.dataVerificacao&&p.dataVerificacao<=new Date().toISOString().slice(0,10)).map(p=>({...p,origem:'fixo',endereco:p.endereco||p['endereço']||'',horario:p.horario||p['horário']||'',aceita:p.aceita||p['o que aceita']||''}));
}
function distanciaOSM(a,b) {
  const r=Math.PI/180,v=Math.sin((b.latitude-a.latitude)*r/2)**2+Math.cos(a.latitude*r)*Math.cos(b.latitude*r)*Math.sin((b.longitude-a.longitude)*r/2)**2;
  return 6371000*2*Math.asin(Math.sqrt(Math.min(1,v)));
}
function nomesParecidosOSM(a,b) {
  const limpar=n=>String(n).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').trim().split(/\s+/);
  const x=new Set(limpar(a)),y=new Set(limpar(b));return [...x].filter(n=>n&&y.has(n)).length/Math.max(x.size,y.size)>=.8;
}
function mesclarPontosOSM(fixos,pontos) {
  const resultado=[];
  for(const p of [...fixos,...pontos])if(!resultado.some(x=>x.id===p.id||(!x.semNome&&!p.semNome&&distanciaOSM(x,p)<30&&nomesParecidosOSM(x.nome,p.nome))))resultado.push(p);
  return resultado.slice(0,200);
}
function dentroAreaOSM(p,b) {return !b||p.latitude>=b[0]&&p.latitude<=b[2]&&p.longitude>=b[1]&&p.longitude<=b[3];}
function esperarOSM(ms,signal) {
  return new Promise((resolve,reject)=>{
    if(signal?.aborted)return reject(abortadoOSM());
    const cancelar=()=>{clearTimeout(t);reject(abortadoOSM());};
    const t=setTimeout(()=>{signal?.removeEventListener('abort',cancelar);resolve();},ms);
    signal?.addEventListener('abort',cancelar,{once:true});
  });
}
function criarClienteOSM({fetcher=fetch,storage,agora=Date.now,esperar=esperarOSM,servidores=servidoresOSM}={}) {
  const chave='ecoa-osm-cache-v1',ttl=900000,cache=new Map();let liberar=0,falhas=0,inicio=0;
  try{for(const [k,v] of JSON.parse(storage?.getItem(chave)||'[]').slice(-20))if(typeof k==='string'&&v&&Number.isFinite(v.em)&&v.em<=agora()&&agora()-v.em<ttl&&Array.isArray(v.pontos)&&v.pontos.length<=200&&v.pontos.every(p=>pontoValidoOSM(p)&&p.origem==='osm'))cache.set(k,v);}catch{}
  async function consultar(categoria,bbox,{signal,ocupado=()=>{}}={}) {
    const query=montarConsultaOSM(categoria,bbox),key=categoria+':'+areaOSM(bbox).join(',');
    if(signal?.aborted)throw abortadoOSM();
    const c=cache.get(key);if(c&&agora()-c.em<ttl)return c.pontos;
    for(let tentativa=0;tentativa<servidores.length;tentativa++) {
      if(liberar>agora()){ocupado(Math.ceil((liberar-agora())/1000));await esperar(liberar-agora(),signal);}
      if(signal?.aborted)throw abortadoOSM();
      const controle=new AbortController(),cancelar=()=>controle.abort();signal?.addEventListener('abort',cancelar,{once:true});
      const timer=setTimeout(cancelar,60000);
      try {
        const r=await fetcher(servidores[inicio%servidores.length],{method:'POST',body:new URLSearchParams({data:query}),signal:controle.signal,credentials:'omit',cache:'no-store'});
        if(r.status===429||r.status===504){const raw=r.headers?.get('Retry-After');const retry=/^\d+$/.test(raw||'')?Number(raw)*1000:Math.max(0,Date.parse(raw)-agora())||0;liberar=agora()+Math.max(retry,30000*2**Math.min(falhas++,3));throw Error('Servidor ocupado. Tente novamente em instantes.');}
        if(!r.ok)throw Error('Não foi possível buscar pontos.');
        let dados;try{dados=await r.json();}catch{throw Error('Não foi possível ler os pontos recebidos. Tente novamente.');}
        const pontos=converterPontosOSM(dados,categoria);
        if(signal?.aborted)throw abortadoOSM();
        cache.delete(key);cache.set(key,{em:agora(),pontos});while(cache.size>20)cache.delete(cache.keys().next().value);
        try{storage?.setItem(chave,JSON.stringify([...cache]));}catch{}
        falhas=0;return pontos;
      } catch(e) {
        if(signal?.aborted)throw abortadoOSM();
        inicio++;
        if(tentativa===servidores.length-1)throw Error(e.name==='AbortError'?'O servidor demorou para responder.':e.message);
        if(liberar<=agora())liberar=agora()+1500;
      } finally {clearTimeout(timer);signal?.removeEventListener('abort',cancelar);}
    }
  }
  return {consultar};
}
function criarBuscaOSM({consultar,receber,estado,relogio=globalThis}) {
  let timer,controller,geracao=0;
  function cancelar(){geracao++;relogio.clearTimeout(timer);controller?.abort();}
  function agendar(cat,bbox,zoom) {
    cancelar();if(!cat){estado('Escolha uma categoria para buscar pontos.','inicial');return;}
    if(zoom<13){receber([]);estado('Aproxime o mapa para ver pontos.','zoom');return;}
    try{montarConsultaOSM(cat,bbox);}catch(e){receber([]);estado(e.message,'zoom');return;}
    const atual=geracao;controller=new AbortController();const signal=controller.signal;
    timer=relogio.setTimeout(async()=>{
      estado('Buscando pontos nesta área…','carregando');
      try{const pontos=await consultar(cat,bbox,{signal,ocupado:s=>{if(atual===geracao)estado(`Servidor ocupado. Nova tentativa em ${s} segundos…`,'carregando');}});if(atual===geracao){receber(pontos);estado(pontos.length?'Pontos atualizados.':'Nenhum ponto encontrado nesta área.','pronto');}}
      catch(e){if(atual===geracao&&e.name!=='AbortError'){estado('Mostrando pontos salvos','salvos');}}
    },600);
  }
  return {agendar,cancelar};
}
// A base distribuída é lida antes da busca ao vivo e funciona no cache offline.
function validarBaseOSM(dados) {
 if(dados?.versao!==1||!dados.categorias)throw Error('Base regional inválida');
 return Object.entries(categoriasOSM).flatMap(([cat])=>{
  const pontos=dados.categorias[cat];
  if(!Array.isArray(pontos)||!pontos.every(p=>pontoValidoOSM(p)&&p.categoria===cat&&p.origem==='osm'))throw Error('Base regional inválida');
  return pontos;
 });
}
function pontosDisponiveisOSM(fixos,salvos,vivos,categoria,bbox){
 const filtrar=lista=>lista.filter(p=>categoriaMapaOSM(p.categoria)===categoria&&dentroAreaOSM(p,bbox));
 // Curadoria tem prioridade; dados ao vivo atualizam a cópia pelo mesmo ID.
 return mesclarPontosOSM(filtrar(fixos),[...filtrar(vivos),...filtrar(salvos)]);
}
function preencherCartaoPonto(doc,item,p){
 const texto=(tag,t)=>{const el=doc.createElement(tag);el.textContent=String(t);item.append(el);};
 texto('p',categoriasOSM[categoriaMapaOSM(p.categoria)].nome);texto('h3',p.nome);
 if(p.origem==='fixo')texto('p','Verificado em '+p.dataVerificacao.split('-').reverse().join('/'));
 for(const t of [p.descricao,[p.endereco,p.bairro,p.cidade,p.UF].filter(Boolean).join(' · '),p.horario&&'Horário: '+p.horario,p.aceita&&'O que aceita / informações: '+p.aceita,p.telefone&&'Telefone: '+p.telefone])if(t)texto('p',t);
 texto('p',p.origem==='supabase'?(p.verificado?'Verificado':'Aprovado pela comunidade'):p.origem==='fixo'?'Verificado pelo Ecoa':'Fonte: OpenStreetMap');texto('p','Dados da comunidade. Confirme antes de ir');
 for(const [rotulo,valor] of [['Site do local',p.site],['Consultar fonte',p.fonte],['Como chegar',`https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`]]){
  try{const u=new URL(valor);if(u.protocol!=='https:'||u.username||u.password)continue;const a=doc.createElement('a');a.textContent=rotulo;a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';a.className='ecoa-button secondary';item.append(a);}catch{}
 }
}
const apiPontosOSM={validarBaseOSM,pontosDisponiveisOSM,categoriaMapaOSM,preencherCartaoPonto,categoriasOSM,servidoresOSM,areaOSM,montarConsultaOSM,converterPontosOSM,validarFixosOSM,distanciaOSM,nomesParecidosOSM,mesclarPontosOSM,dentroAreaOSM,criarClienteOSM,criarBuscaOSM};
if(typeof module!=='undefined')module.exports=apiPontosOSM;else window.EcoaPontosOSM=apiPontosOSM;
