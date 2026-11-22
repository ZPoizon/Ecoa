// Gerador puro: não usa armazenamento nem envia cadastros.
const categoriasCurador={reciclagem:'Reciclagem',doacao:'Doação',agua:'Água potável',horta:'Horta','oleo-de-cozinha':'Óleo de cozinha','pilhas-eletronicos':'Pilhas e eletrônicos',outro:'Outro'};
function hojeCurador(data=new Date()){return `${data.getFullYear()}-${String(data.getMonth()+1).padStart(2,'0')}-${String(data.getDate()).padStart(2,'0')}`;}
function validarPontoCurador(dados,hoje=hojeCurador()){
 const p={};
 const campos={nome:120,descricao:300,endereco:240,bairro:100,cidade:100,UF:2,horario:200,aceita:300,telefone:40,site:500,fonte:500,dataVerificacao:10};
 for(const [k,max] of Object.entries(campos)){if(dados[k]!=null&&typeof dados[k]!=='string')throw Error(`Confira o campo ${k}.`);p[k]=(dados[k]||'').trim();if(p[k].length>max)throw Error(`O campo ${k} aceita até ${max} caracteres.`);}
 for(const k of ['nome','descricao','endereco','cidade','UF','fonte','dataVerificacao'])if(!p[k])throw Error(`Preencha ${k}.`);
 p.UF=p.UF.toUpperCase();if(!'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ').includes(p.UF))throw Error('Informe uma UF brasileira válida.');
 if(!Object.hasOwn(categoriasCurador,dados.categoria))throw Error('Escolha a categoria.');p.categoria=dados.categoria;
 for(const k of ['latitude','longitude']){if(dados[k]==null||String(dados[k]).trim()==='')throw Error('Escolha a posição ou preencha as coordenadas.');p[k]=Number(String(dados[k]).replace(',','.'));if(!Number.isFinite(p[k])||Math.abs(p[k])>(k==='latitude'?90:180))throw Error('Coordenadas inválidas.');}
 for(const k of ['site','fonte'])if(p[k]){let u;try{u=new URL(p[k]);}catch{throw Error(`Use um endereço HTTPS em ${k}.`);}if(u.protocol!=='https:'||u.username||u.password)throw Error(`Use um endereço HTTPS sem senha em ${k}.`);}
 const d=new Date(p.dataVerificacao+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(p.dataVerificacao)||!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==p.dataVerificacao||p.dataVerificacao>hoje)throw Error('A data de verificação deve existir e não pode ser futura.');
 return p;
}
function gerarPontosCurador(base,dados,api,hoje){
 if(!Array.isArray(base)||base.some(p=>!p||typeof p.id!=='string')||new Set(base.map(p=>p.id)).size!==base.length)throw Error('A base atual tem um formato ou identificadores inválidos. Corrija o arquivo antes de continuar.');
 if(api.validarFixosOSM(base).length!==base.filter(p=>p.exemplo!==true).length)throw Error('Há pontos inválidos na base atual. Revise o arquivo antes de continuar.');
 const novo=validarPontoCurador(dados,hoje);
 const duplicado=base.find(p=>!p.exemplo&&api.distanciaOSM(p,novo)<30&&api.nomesParecidosOSM(p.nome,novo.nome));
 const slug=novo.nome.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'ponto';
 let id=slug,i=2;while(base.some(p=>p.id===id))id=slug+'-'+i++;
 const ponto=duplicado||{id,...novo};
 const pontos=[...base,...(duplicado?[]:[ponto])].sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')||a.id.localeCompare(b.id,'pt-BR'));
 return {ponto,pontos,duplicado:!!duplicado,json:JSON.stringify(pontos,null,2)+'\n',trecho:JSON.stringify(ponto,null,2)};
}
if(typeof module!=='undefined')module.exports={categoriasCurador,hojeCurador,validarPontoCurador,gerarPontosCurador};
