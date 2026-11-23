// Conversão pontual da base antiga por raio (Capão Bonito) para o formato por município.
// Não consulta serviços externos e pode ser executada novamente sem perder a base atual.
import {readFile, writeFile, mkdir, rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const raiz=fileURLToPath(new URL('../',import.meta.url));
const entrada=JSON.parse(await readFile(path.join(raiz,'public/pontos-osm.json'),'utf8'));
const id='3510203',cidade='Capão Bonito',uf='SP';
const brutosLocais=[];
const adicionar=(ponto)=>{
 const chave=[ponto.categoria,ponto.latitude,ponto.longitude,ponto.nome].join('|');
 if(!brutosLocais.some(p=>[p.categoria,p.latitude,p.longitude,p.nome].join('|')===chave))brutosLocais.push(ponto);
};
adicionar({
 nome:'Parque das Águas Prefeito Dr. Hélio de Souza',categoria:'horta',
 latitude:-24.0111566,longitude:-48.3480946,endereco:'Bairro Cruzeiro — endereço não informado na notícia municipal',
 bairro:'Cruzeiro',cidade,UF:uf,
 descricao:'A Prefeitura noticiou em 2025 a inauguração da primeira fase da revitalização do parque; é área verde, não ponto de descarte.',
 fonte:'https://capaobonito.sp.gov.br/inauguracao-da-primeira-fase-do-parque-das-aguas-acontece-no-dia-25-de-outubro',
 origem:'base',precisao:'aproximada: geometria OSM way/226322758, não é a entrada',
 confianca:'alta',situacao:'vigente-2026'
});
const categoriaId=valor=>String(valor||'').replace(/[^a-z-]/g,'').replace(/^verde$/,'horta').replace(/^outros$/,'outro')||'outro';
for(const [categoria,brutos] of Object.entries(entrada.categorias||{})){
 for(const p of brutos||[]){
  const cat=categoriaId(categoria);
  adicionar({
   nome:String(p.nome||'').slice(0,200),categoria:cat,latitude:p.latitude,longitude:p.longitude,
   endereco:String(p.endereco||'').slice(0,300),cidade,UF:uf,
   descricao:'Ponto listado na base OpenStreetMap distribuída com o Ecoa; sem confirmação presencial pelo projeto.',
   fonte:String(p.fonte||'https://www.openstreetmap.org/copyright'),origem:'base',
   precisao:'localização OSM; a fonte não informa o município de todos os elementos',
   confianca:'media',situacao:'reconfirmar'
  });
 }
}
const contadores={};
const locais=brutosLocais.map(p=>{
 const cat=p.categoria;contadores[cat]=(contadores[cat]||0)+1;
 return {id:`base-${id}-${cat}-${contadores[cat]}`,...p};
});
const base={versao:1,id,cidade,uf,ibge:id,osmRelation:298192,abrangencia:'cidade e arredores',
 geradoEm:'2026-11-23',fonte:'Base OSM distribuída com o Ecoa (raio de 25 km, 22/11/2026), convertida em 23/11/2026, e notícia oficial da Prefeitura de Capão Bonito.',
 licenca:'ODbL-1.0',pontos:locais};
const destino=path.join(raiz,'public/bases',`${id}.json`);
await mkdir(path.dirname(destino),{recursive:true});
await writeFile(destino+'.tmp',JSON.stringify(base,null,2)+'\n');
await rename(destino+'.tmp',destino);
console.log(`${id}.json: ${locais.length} pontos`);
