// Node 22+, sem dependências. Uma consulta reúne todas as categorias.
import {createRequire} from 'node:module';
import {mkdir, writeFile, rename} from 'node:fs/promises';
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
async function main(){
 const args=process.argv.slice(2);if(args.length&&!(args.length===2&&args[0]==='--raio-km'))throw Error('Uso: node scripts/importar-osm.mjs [--raio-km 25]');
 const base=await importar({raioKm:args.length?Number(args[1]):25});
 const raiz=fileURLToPath(new URL('../',import.meta.url));
 for(const pasta of ['public','dist']){
  await mkdir(path.join(raiz,pasta),{recursive:true});
  const destino=path.join(raiz,pasta,'pontos-osm.json');
  await writeFile(destino+'.tmp',JSON.stringify(base,null,2)+'\n');await rename(destino+'.tmp',destino);
 }
 console.log('Base regional atualizada em public/ e dist/:',Object.fromEntries(Object.entries(base.categorias).map(([k,v])=>[k,v.length])));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error('Importação não concluída. Arquivos anteriores preservados.',e.message);process.exitCode=1;});
