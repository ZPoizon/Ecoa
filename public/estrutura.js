// Apenas layout e navegação: não lê nem altera dados salvos.
function iniciarEstruturaEcoa(doc,janela){
 const painel=doc.getElementById('leitura-painel');
 if(painel){
  const gatilho=painel.querySelector('summary');
  painel.addEventListener('keydown',e=>{if(e.key==='Escape'&&painel.open){e.preventDefault();painel.open=false;gatilho.focus();}});
  doc.addEventListener('click',e=>{if(painel.open&&!painel.contains(e.target))painel.open=false;});
  doc.addEventListener('ecoa-rota',e=>{if(e.detail.alvo!=='preferencia-tema')painel.open=false;});
 }
 const nav=doc.querySelector('.ecoa-nav');
 if(nav&&janela.ResizeObserver){
  const atualizar=()=>doc.documentElement.style.setProperty('--ecoa-nav-altura',Math.ceil(nav.getBoundingClientRect().height)+'px');
  new janela.ResizeObserver(atualizar).observe(nav);atualizar();
 }
}
if(typeof module!=='undefined')module.exports={iniciarEstruturaEcoa};else iniciarEstruturaEcoa(document,window);
