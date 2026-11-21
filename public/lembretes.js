const chaveLembretes='ecoa-lembretes-v1';
function validarLembretes(dados,catalogo) {
  if(!dados||dados.versao!==1||typeof dados.notificacoes!=='boolean'||!Array.isArray(dados.itens)||dados.itens.length>catalogo.length)throw Error('Os lembretes salvos não puderam ser lidos. Nenhum dado foi apagado.');
  const chaves=new Set(catalogo.map(a=>a.ods+':'+a.titulo)),vistos=new Set();
  const itens=dados.itens.map(x=>{
    if(!x||!chaves.has(x.chave)||vistos.has(x.chave)||!Number.isSafeInteger(x.quando)||x.quando<0||x.quando>253402300799999||typeof x.avisado!=='boolean')throw Error('Há um lembrete inválido. Nenhum dado foi apagado.');
    vistos.add(x.chave);return {chave:x.chave,quando:x.quando,avisado:x.avisado};
  });return {versao:1,notificacoes:dados.notificacoes,itens};
}
function lerLembretes(storage,catalogo){try{const texto=storage.getItem(chaveLembretes);return texto?validarLembretes(JSON.parse(texto),catalogo):{versao:1,notificacoes:false,itens:[]};}catch{throw Error('Não foi possível ler os lembretes salvos. Nenhum dado foi apagado.');}}
function salvarLembretes(storage,dados,catalogo){const seguros=validarLembretes(dados,catalogo);try{storage.setItem(chaveLembretes,JSON.stringify(seguros));}catch{throw Error('Não foi possível salvar os lembretes neste navegador.');}return seguros;}
function horarioLembrete(texto,agora=Date.now()) {
  if(typeof texto!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(texto))throw Error('Escolha data e horário.');
  const [ano,mes,dia,hora,minuto]=texto.match(/\d+/g).map(Number),data=new Date(ano,mes-1,dia,hora,minuto);
  if(data.getFullYear()!==ano||data.getMonth()!==mes-1||data.getDate()!==dia||data.getHours()!==hora||data.getMinutes()!==minuto||data.getTime()<=agora)throw Error('Escolha uma data e horário futuros válidos no fuso do aparelho.');
  return data.getTime();
}
function agendarLembrete(dados,chave,quando,plano,agora=Date.now()) {
  if(plano.get(chave)!==false)throw Error('Escolha uma ação pendente do Meu plano.');
  if(!Number.isSafeInteger(quando)||quando<=agora)throw Error('Escolha um horário futuro.');
  return {...dados,itens:[...dados.itens.filter(x=>x.chave!==chave),{chave,quando,avisado:false}]};
}
function lembretesVencidos(dados,plano,agora=Date.now()){return dados.itens.filter(x=>!x.avisado&&x.quando<=agora&&plano.get(x.chave)===false);}
function reconciliarLembretes(dados,plano){return {...dados,itens:dados.itens.filter(x=>plano.get(x.chave)===false)};}
async function permitirNotificacoes(ambiente) {
  if(!ambiente.isSecureContext||!ambiente.Notification?.requestPermission) return 'indisponivel';
  if(ambiente.Notification.permission!=='default')return ambiente.Notification.permission;
  return ambiente.Notification.requestPermission(); // Chamada somente pelo clique em Ativar.
}
async function notificarLembrete(ambiente,acao) {
  if(ambiente.Notification?.permission!=='granted')return false;
  const registro=await ambiente.navigator.serviceWorker?.getRegistration();
  if(!registro?.active||!registro.showNotification)return false;
  await registro.showNotification('Ecoa · Hora de agir',{body:acao.titulo,tag:'ecoa-lembrete-'+acao.ods+':'+acao.titulo,icon:new URL('icons/icon-192.png',ambiente.location.href).href,data:{ecoa:true}});
  return true;
}
function calendarioLembrete(acao,quando,agora=Date.now()) {
  const escapar=s=>String(s).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
  const utc=n=>new Date(n).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const linhas=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Ecoa//Lembretes//PT-BR','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:ecoa-${acao.ods}-${encodeURIComponent(acao.titulo)}-${quando}@ecoa.local`,`DTSTAMP:${utc(agora)}`,`DTSTART:${utc(quando)}`,`DTEND:${utc(quando+15*60000)}`,`SUMMARY:${escapar('Ecoa: '+acao.titulo)}`,`DESCRIPTION:${escapar('Ação sugerida pelo Ecoa. Confira seu Meu plano. Ajuste o alerta no aplicativo de calendário.')}`,'BEGIN:VALARM','TRIGGER:PT0S','ACTION:DISPLAY',`DESCRIPTION:${escapar(acao.titulo)}`,'END:VALARM','END:VEVENT','END:VCALENDAR'];
  // RFC 5545: dobra linhas por octetos UTF-8 sem cortar caracteres.
  return linhas.map(l=>{let linha='',bytes=0,partes=[];for(const c of l){const n=new TextEncoder().encode(c).length;if(bytes+n>75){partes.push(linha);linha=' ';bytes=1;}linha+=c;bytes+=n;}partes.push(linha);return partes.join('\r\n');}).join('\r\n')+'\r\n';
}
if(typeof module!=='undefined')module.exports={chaveLembretes,validarLembretes,lerLembretes,salvarLembretes,horarioLembrete,agendarLembrete,lembretesVencidos,reconciliarLembretes,permitirNotificacoes,notificarLembrete,calendarioLembrete};
