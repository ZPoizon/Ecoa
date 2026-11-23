// Node 22+, sem dependências. Uma consulta reúne todas as categorias.
import {createRequire} from 'node:module';
import {mkdir, writeFile, rename, readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const require=createRequire(import.meta.url);
const api=require('../public/pontos-osm.js');
export function consultaImportacao(raioKm=25){
 if(!Number.isFinite(raioKm)||raioKm<1||raioKm>100)throw Error('Use --raio-km entre 1 e 100.');
 const tags=[...new Map(Object.values(api.categoriasOSM).flatMap(c=>c.tags).map(t=>[t.join('='),t])).values()];
 return `/* Ecoa: base regional, atualização manual */[out:json][timeout:90];(${tags.map(([k,v])=>`nwr["${k}"="${v}"](around:${raioKm*1000},-24.01,-48.35);`).join('')});out center tags;`;
}
export function converterImportacao(dados,raioKm=25){
 if(!Array.isArray(dados?.elements)||dados.remark)throw Error('Resposta incompleta; base anterior preservada.');
 const categorias={};
 for(const [cat,config] of Object.entries(api.categoriasOSM)){
  const elementos=dados.elements.filter(e=>config.tags.some(([k,v])=>e.tags?.[k]===v));
  // Conversor compartilhado limita cada lote a 200, sem truncar a base regional.
  categorias[cat]=[];
  for(let i=0;i<elementos.length;i+=200)categorias[cat].push(...api.converterPontosOSM({elements:elementos.slice(i,i+200)},cat));
 }
 return {versao:1,geradoEm:new Date().toISOString(),centro:[-24.01,-48.35],raioKm,fonte:'https://www.openstreetmap.org/copyright',licenca:'ODbL-1.0',categorias};
}
export async function importar({raioKm=25,fetcher=fetch,servidores=api.servidoresOSM}={}){
 const query=consultaImportacao(raioKm);
 let ultimo;
 for(const servidor of servidores){
  try{
   const r=await fetcher(servidor,{method:'POST',body:new URLSearchParams({data:query}),headers:{'User-Agent':'Ecoa-importador/1.0 (https://github.com/ZPoizon/Ecoa)'},signal:AbortSignal.timeout(120000)});
   if(!r.ok)throw Error(`Servidor respondeu ${r.status}. Tente novamente mais tarde.`);
   return converterImportacao(await r.json(),raioKm);
  }catch(e){ultimo=e;}
 }
 throw ultimo;
}
// Formato por município: a consulta usa a área administrativa do relation, não um raio
// atribuído à cidade central. O raio só é usado com --abrangencia "cidade e arredores".
export function consultaImportacaoMunicipio({osmRelation,raioKm=0,centro=[]}={}){
 if(!Number.isSafeInteger(osmRelation)||osmRelation<=0)throw Error('Informe --osm-relacao da relation do município.');
 const tags=[...new Map(Object.values(api.categoriasOSM).flatMap(c=>c.tags).map(t=>[t.join('='),t])).values()];
 let pre='',escopo='(area.a)';
 if(raioKm>0){
  if(!Array.isArray(centro)||centro.length!==2||!centro.every(Number.isFinite))throw Error('Informe --lat e --lng com o raio.');
  if(raioKm>100)throw Error('Use --raio-km entre 1 e 100.');
  escopo=`(around:${raioKm*1000},${centro[0]},${centro[1]})`;
 }else pre=`area(${3600000000+osmRelation})->.a;`;
 return `/* Ecoa: base municipal, atualização manual */[out:json][timeout:90];${pre}(${tags.map(([k,v])=>`nwr["${k}"="${v}"]${escopo};`).join('')});out center tags;`;
}
export function converterImportacaoMunicipio(dados,{id,cidade,uf,osmRelation,abrangencia='municipio',raioKm=0,centro=[]}={}){
 if(!Array.isArray(dados?.elements)||dados.remark)throw Error('Resposta incompleta; base anterior preservada.');
 if(!/^[0-9]{7}$/.test(String(id||''))||!cidade||!/^[A-Z]{2}$/.test(String(uf||'')))throw Error('Identificação do município inválida.');
 if(abrangencia!=='municipio'&&abrangencia!=='cidade e arredores')throw Error('Abrangência inválida.');
 const pontos=[];
 for(const [cat,config] of Object.entries(api.categoriasOSM)){
  const elementos=dados.elements.filter(e=>config.tags.some(([k,v])=>e.tags?.[k]===v));
  const convertidos=[];
  for(let i=0;i<elementos.length;i+=200)convertidos.push(...api.converterPontosOSM({elements:elementos.slice(i,i+200)},cat));
  for(const [indice,p] of convertidos.entries())pontos.push({
   id:`base-${id}-${cat}-${indice+1}`,nome:p.nome,categoria:cat,latitude:p.latitude,longitude:p.longitude,
   endereco:p.endereco,cidade:String(p.cidade||cidade).slice(0,100),UF:String(p.UF||uf).toUpperCase().slice(0,2),
   horario:p.horario,aceita:p.aceita,descricao:'Elemento OpenStreetMap importado; serviço e horário devem ser confirmados antes de ir.',
   fonte:p.fonte,origem:'base',precisao:'localização OpenStreetMap; conferir no local',
   confianca:'media',situacao:'reconfirmar'
  });
 }
 if(pontos.length>200)throw Error('Base acima de 200 pontos; reduza o raio ou divida a cidade.');
 return {versao:1,id:String(id),cidade:String(cidade).slice(0,100),uf:String(uf).toUpperCase(),ibge:String(id),
  osmRelation,abrangencia,raioKm,centro,geradoEm:new Date().toISOString(),
  fonte:'https://www.openstreetmap.org/copyright',licenca:'ODbL-1.0',pontos};
}
export async function importarMunicipio({fetcher=fetch,servidores=api.servidoresOSM,...opcoes}={}){
 const query=consultaImportacaoMunicipio(opcoes);
 let ultimo;
 for(const servidor of servidores){
  try{
   const r=await fetcher(servidor,{method:'POST',body:new URLSearchParams({data:query}),headers:{'User-Agent':'Ecoa-importador/1.0 (https://github.com/ZPoizon/Ecoa)'},signal:AbortSignal.timeout(120000)});
   if(!r.ok)throw Error(`Servidor respondeu ${r.status}. Tente novamente mais tarde.`);
   return converterImportacaoMunicipio(await r.json(),opcoes);
  }catch(e){ultimo=e;}
 }
 throw ultimo;
}
async function escreverAtomicamente(raiz,caminho,conteudo){
 const destino=path.join(raiz,caminho);
 await mkdir(path.dirname(destino),{recursive:true});
 await writeFile(destino+'.tmp',conteudo);
 await rename(destino+'.tmp',destino);
}
async function atualizarIndice(raiz,base){
 const destino=path.join(raiz,'public/bases-regiao-indice.json');
 let indice;
 try{indice=JSON.parse(await readFile(destino,'utf8'));}catch{indice={versao:1,cidades:[]};}
 const entrada={
  id:base.id,cidade:base.cidade,uf:base.uf,ibge:base.ibge,osmRelation:base.osmRelation,
  centro:base.centro.length?base.centro:null,abrangencia:base.abrangencia,quantidade:base.pontos.length,
  geradoEm:base.geradoEm.slice(0,10),arquivo:`bases/${base.id}.json`,
  cobertura:`Importação manual de ${base.abrangencia}, fonte OpenStreetMap (ODbL).`
 };
 if(!Array.isArray(indice.cidades))indice.cidades=[];
 indice.cidades=indice.cidades.filter(c=>String(c.id)!==String(base.id)).concat(entrada);
 indice.atualizadoEm=base.geradoEm.slice(0,10);
 await escreverAtomicamente(raiz,'public/bases-regiao-indice.json',JSON.stringify(indice,null,2)+'\n');
}
function argumentos(argv){
 const resultado={};
 for(let i=0;i<argv.length;i+=2){
  const chave=argv[i],valor=argv[i+1];
  if(!chave?.startsWith('--')||valor===undefined)throw Error('Use pares --opcao valor.');
  resultado[chave.slice(2)]=valor;
 }
 return resultado;
}
async function main(){
 const args=process.argv.slice(2),raiz=fileURLToPath(new URL('../',import.meta.url));
 if(!args.length){
  const base=await importar({raioKm:25});
  for(const pasta of ['public','dist'])await escreverAtomicamente(raiz,`${pasta}/pontos-osm.json`,JSON.stringify(base,null,2)+'\n');
  console.log('Base regional antiga atualizada em public/ e dist/:',Object.fromEntries(Object.entries(base.categorias).map(([k,v])=>[k,v.length])));
  return;
 }
 const opcoes=argumentos(args);
 if(!opcoes.cidade)throw Error('Uso: node scripts/importar-osm.mjs --cidade "Nome" --uf SP --ibge 1234567 --osm-relacao 298192 [--lat -23 --lng -47 --raio-km 10 --abrangencia "cidade e arredores"]');
 const centro=opcoes.lat!==undefined&&opcoes.lng!==undefined?[Number(opcoes.lat),Number(opcoes.lng)]:[];
 const base=await importarMunicipio({
  id:opcoes.ibge,cidade:opcoes.cidade,uf:opcoes.uf,osmRelation:Number(opcoes.osmRelation),
  raioKm:opcoes['raio-km']?Number(opcoes['raio-km']):0,centro,
  abrangencia:opcoes.abrangencia||(opcoes['raio-km']?'cidade e arredores':'municipio')
 });
 for(const pasta of ['public','dist'])await escreverAtomicamente(raiz,`${pasta}/bases/${base.id}.json`,JSON.stringify(base,null,2)+'\n');
 await atualizarIndice(raiz,base);
 console.log(`Base de ${base.cidade}/${base.uf} atualizada: ${base.pontos.length} pontos. Índice ajustado.`);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error('Importação não concluída. Arquivos anteriores preservados.',e.message);process.exitCode=1;});
