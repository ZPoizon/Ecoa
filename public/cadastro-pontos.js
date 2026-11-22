// Validações e envio independentes da interface. Não altera chaves antigas.
const CHAVE_ENVIOS_PONTOS='ecoa:pontos:envios-v1';
const MOTIVOS_DENUNCIA=['endereco_errado','nao_existe','conteudo_improprio'];
function validarCadastroPonto(dados){
 if(String(dados.website_extra||'').trim())throw Error('Não foi possível validar o formulário. Recarregue a página e tente novamente.');
 if(dados.localPublico!==true)throw Error('Confirme: este é um local público.');
 const limites={nome:[3,120],cidade:[2,100],uf:[2,2],bairro:[0,100],endereco:[3,240],descricao:[3,600],horario:[0,200],aceita:[0,300],telefone:[0,40],site:[0,500]};
 const nomes={nome:'Nome',cidade:'Cidade',uf:'UF',bairro:'Bairro',endereco:'Endereço',descricao:'Descrição',horario:'Horário',aceita:'O que aceita',telefone:'Telefone',site:'Site'};
 const p={};
 for(const [k,[min,max]] of Object.entries(limites)){
  if(dados[k]!==undefined&&typeof dados[k]!=='string')throw Error('Confira o campo '+nomes[k]+'.');
  const t=(dados[k]||'').trim();if(t.length<min||t.length>max)throw Error(`${nomes[k]} deve ter ${min?`de ${min} a`:'até'} ${max} caracteres.`);p[k]=t;
 }
 p.uf=p.uf.toUpperCase();if(!'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ').includes(p.uf))throw Error('Escolha uma UF válida.');
 if(!['reciclagem','doacao','agua','horta','oleo-de-cozinha','pilhas-eletronicos','outro'].includes(dados.categoria))throw Error('Escolha uma categoria.');p.categoria=dados.categoria;
 for(const [k,max] of [['lat',90],['lng',180]]){
  const v=dados[k];if(!['string','number'].includes(typeof v)||String(v).trim()==='')throw Error('Informe a posição do local no mapa ou as coordenadas.');
  p[k]=Number(String(v).replace(',','.'));if(!Number.isFinite(p[k])||Math.abs(p[k])>max)throw Error('Latitude ou longitude inválida.');
 }
 if(p.site){try{const u=new URL(p.site);if(u.protocol!=='https:'||u.username||u.password||/\s/.test(p.site))throw Error();}catch{throw Error('Informe um site HTTPS válido ou deixe o campo vazio.');}}
 // Lista explícita impede campos de moderação/contadores vindos do formulário.
 p.status='pendente';p.verificado=false;return p;
}
function diaEnviosPontos(data=new Date()){return [data.getFullYear(),String(data.getMonth()+1).padStart(2,'0'),String(data.getDate()).padStart(2,'0')].join('-');}
function reservarEnvioPonto(storage,data=new Date()){
 try{
  const dia=diaEnviosPontos(data),raw=storage.getItem(CHAVE_ENVIOS_PONTOS);let total=0;
  if(raw){const anterior=JSON.parse(raw);if(typeof anterior.dia!=='string'||!Number.isInteger(anterior.total)||anterior.total<0)throw Error();if(anterior.dia===dia)total=anterior.total;}
  if(total>=5)throw Error('Você atingiu o limite de 5 envios hoje neste aparelho. Tente novamente amanhã.');
  storage.setItem(CHAVE_ENVIOS_PONTOS,JSON.stringify({dia,total:total+1}));return total+1;
 }catch(e){if(e.message?.includes('5 envios'))throw e;throw Error('Libere o armazenamento deste site no navegador para enviar. Seus dados anteriores não foram apagados.');}
}
function duplicadosCadastroPonto(p,lista,api){
 return lista.filter(x=>!x.exemplo&&!/^EXEMPLO/i.test(x.nome||'')&&api.distanciaOSM({latitude:p.lat,longitude:p.lng},x)<=100&&api.nomesParecidosOSM(p.nome,x.nome));
}
function mensagemErroEnvioPonto(status,codigo){
 if(codigo==='PGRST205'||codigo==='42P01'||status===404)return 'O cadastro ainda não está disponível: falta configurar a tabela no serviço. Avise o responsável pelo Ecoa.';
 if(codigo==='42501'||status===401||status===403)return 'O serviço não autorizou este envio. O responsável pelo Ecoa precisa conferir as permissões de cadastro.';
 if(status===429)return 'Muitos envios neste momento. Aguarde alguns minutos antes de tentar novamente.';
 if(status===400||status===409||status===422)return 'O serviço não aceitou os dados. Confira os campos; o ponto pode ter sido removido ou alterado.';
 return 'Não foi possível confirmar o envio. Confira sua conexão e tente mais tarde. Não repetimos o envio automaticamente.';
}
function validarDenunciaPonto(pontoId,motivo){
 if(typeof pontoId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pontoId)||!MOTIVOS_DENUNCIA.includes(motivo))throw Error('Escolha um ponto e um motivo válido.');
 return {ponto_id:pontoId,motivo};
}
function criarEnviosPontos(config,{fetcher=fetch,storage,locks,agora=()=>new Date()}={}){
 async function postar(tabela,payload){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{
   const r=await fetcher(new URL('/rest/v1/'+tabela,config.SUPABASE_URL),{method:'POST',headers:{apikey:config.SUPABASE_ANON_KEY,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(payload),signal:controller.signal,cache:'no-store',credentials:'omit'});
   if(!r.ok){let erro={};try{erro=await r.json();}catch{}const e=Error(mensagemErroEnvioPonto(r.status,erro.code));e.tratado=true;throw e;}
  }catch(e){if(e.tratado)throw e;throw Error(mensagemErroEnvioPonto());}finally{clearTimeout(timer);}
 }
 async function enviar(tabela,payload){
  const acao=async()=>{reservarEnvioPonto(storage,agora());await postar(tabela,payload);};
  // Uma reserva por tentativa, antes da rede. Timeout pode ter sido gravado no banco.
  // Web Locks serializa abas onde suportado; limite local não substitui proteção do servidor.
  return locks?.request?locks.request('ecoa-envio-pontos',acao):acao();
 }
 return {cadastrar:dados=>enviar('pontos',validarCadastroPonto(dados)),denunciar:(id,motivo)=>enviar('denuncias',validarDenunciaPonto(id,motivo))};
}
const apiCadastroPontos={CHAVE_ENVIOS_PONTOS,MOTIVOS_DENUNCIA,validarCadastroPonto,diaEnviosPontos,reservarEnvioPonto,duplicadosCadastroPonto,mensagemErroEnvioPonto,validarDenunciaPonto,criarEnviosPontos};
if(typeof module!=='undefined')module.exports=apiCadastroPontos;else window.EcoaCadastroPontos=apiCadastroPontos;
