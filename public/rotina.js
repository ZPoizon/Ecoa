// Seleção pela data local, sem sorteio, rede ou nova chave de armazenamento.
function escolherAcaoDoDia(catalogo,data=new Date()) {
  if(!catalogo.length || !Number.isFinite(data.getTime()))return null;
  const dia=Math.floor(Date.UTC(data.getFullYear(),data.getMonth(),data.getDate())/86400000);
  return catalogo[((dia%catalogo.length)+catalogo.length)%catalogo.length];
}
function iniciarInstalacaoEcoa(doc,janela) {
  const botao=doc.getElementById('instalar-ecoa'),ajuda=doc.getElementById('instalacao-ajuda');
  let evento=null,ocupado=false;
  const modo=janela.matchMedia?.('(display-mode: standalone)');
  function instalado(){return modo?.matches||janela.navigator?.standalone===true;}
  function atualizar(){botao.hidden=instalado();ajuda.textContent=instalado()?'O Ecoa está aberto como aplicativo.':'Instale para abrir o Ecoa pela tela inicial.';}
  janela.addEventListener('beforeinstallprompt',e=>{e.preventDefault();evento=e;atualizar();});
  janela.addEventListener('appinstalled',()=>{evento=null;botao.hidden=true;ajuda.textContent='Ecoa instalado!';});
  modo?.addEventListener?.('change',atualizar);
  botao.addEventListener('click',async()=>{
    if(ocupado)return;
    if(!evento){ajuda.textContent='No iPhone ou iPad, abra no Safari e use Compartilhar > Adicionar à Tela de Início. Em outros navegadores, procure Instalar aplicativo ou Adicionar à tela inicial no menu. A opção depende do navegador.';return;}
    const pedido=evento;evento=null;ocupado=true;botao.disabled=true;
    try{await pedido.prompt();const escolha=await pedido.userChoice;ajuda.textContent=escolha.outcome==='accepted'?'Instalação solicitada. Aguarde a confirmação do navegador.':'Tudo bem! Você pode continuar usando o site.';}
    catch{ajuda.textContent='Não foi possível abrir a instalação. Tente pelo menu do navegador.';}
    finally{ocupado=false;botao.disabled=false;}
  });atualizar();
}
function iniciarGradeDesafio(doc,nomes) {
  const select=doc.getElementById('desafio-ods'),grade=doc.getElementById('desafio-grade');
  const botoes=nomes.map((nome,i)=>{
    const botao=doc.createElement('button');botao.type='button';botao.className='desafio-objetivo';
    botao.setAttribute('aria-label',`ODS ${i+1} — ${nome}`);
    const img=doc.createElement('img');img.src=`ods/${i+1}.webp`;img.alt='';img.width=160;img.height=160;
    const marca=doc.createElement('span');marca.className='desafio-marca';marca.setAttribute('aria-hidden','true');marca.textContent='✓';
    botao.append(img,marca);botao.addEventListener('click',()=>{select.value=String(i+1);atualizar();});grade.append(botao);return botao;
  });
  function atualizar(){botoes.forEach((b,i)=>b.setAttribute('aria-pressed',String(Number(select.value)===i+1)));}
  select.addEventListener('change',atualizar);atualizar();select.hidden=true;
  doc.getElementById('desafio-select-rotulo').hidden=true;
  return {atualizar};
}
function iniciarAcaoDiaria(doc,catalogo,agora=()=>new Date()) {
  function atualizar(){
    const acao=escolherAcaoDoDia(catalogo,agora());doc.getElementById('acao-do-dia').hidden=!acao;if(!acao)return;
    doc.getElementById('acao-dia-titulo').textContent=acao.titulo;
    doc.getElementById('acao-dia-resumo').textContent=`ODS ${acao.ods} · ${acao.tempo} min · ${acao.custo?'Até R$ '+acao.custo:'Sem gastar'}`;
    doc.getElementById('acao-dia-link').href='#/agir?acao='+encodeURIComponent(acao.ods+':'+acao.titulo);
  }
  doc.addEventListener('visibilitychange',()=>{if(!doc.hidden)atualizar();});
  doc.addEventListener('ecoa-rota',e=>{if(e.detail.tela==='inicio')atualizar();});atualizar();return {atualizar};
}
if(typeof module!=='undefined')module.exports={escolherAcaoDoDia,iniciarInstalacaoEcoa,iniciarGradeDesafio,iniciarAcaoDiaria};
else{iniciarAcaoDiaria(document,acoes);iniciarGradeDesafio(document,objetivos);iniciarInstalacaoEcoa(document,window);}
