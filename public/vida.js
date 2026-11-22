// Apresentação derivada dos dados existentes; não grava no armazenamento.
function sortearAcaoEcoa(catalogo,anterior='',aleatorio=Math.random){
  if(!catalogo.length)return null;
  const outras=catalogo.filter(a=>a.ods+':'+a.titulo!==anterior);
  const opcoes=outras.length?outras:catalogo;
  const valor=aleatorio();
  const indice=Math.min(opcoes.length-1,Math.max(0,Math.floor((Number.isFinite(valor)?valor:0)*opcoes.length)));
  return opcoes[indice];
}
function iniciarVidaEcoa(doc,ambiente,api){
  const $=id=>doc.getElementById(id);
  const movimento=ambiente.matchMedia('(prefers-reduced-motion: reduce)');
  let animacoes=[],timer,anterior='';
  function parar(){animacoes.forEach(a=>a.cancel());animacoes=[];}
  function limpar(){parar();ambiente.clearTimeout(timer);$('vida-celebracao').hidden=true;}
  function atualizar(){
    const dados=api.progresso(),percentual=dados.salvas?Math.round(dados.concluidas/dados.salvas*100):0;
    const anel=$('inicio-anel');anel.hidden=!dados.salvas;
    anel.setAttribute('aria-valuenow',String(percentual));
    anel.setAttribute('aria-valuetext',`${dados.concluidas} de ${dados.salvas} ações concluídas`);
    $('inicio-anel-valor').textContent=percentual+'%';
    $('inicio-anel-traco').setAttribute('stroke-dasharray',`${percentual} 100`);
    const sequencia=api.sequencia();
    $('inicio-sequencia').textContent=sequencia===null?'Sequência do desafio indisponível neste aparelho.':`Desafio de 7 dias · Sequência atual: ${sequencia} ${sequencia===1?'dia':'dias'}.`;
  }
  function celebrar(total){
    limpar();atualizar();
    $('vida-celebracao').hidden=false;
    $('vida-contador').textContent=String(total);
    $('vida-mensagem').textContent=`Ação concluída! ${total} ${total===1?'ação concluída':'ações concluídas'} no seu plano.`;
    if(!movimento.matches){
      for(const el of doc.querySelectorAll('[data-vida-animar]')){
        if(el.animate)animacoes.push(el.animate([{opacity:.3,transform:'scale(.75)'},{opacity:1,transform:'scale(1)'}],{duration:650,easing:'ease-out'}));
      }
    }
    timer=ambiente.setTimeout(limpar,5000);
  }
  movimento.addEventListener?.('change',()=>{if(movimento.matches)parar();});
  $('surpreenda-me').addEventListener('click',()=>{
    const acao=sortearAcaoEcoa(api.catalogo,anterior,api.aleatorio);
    if(!acao){$('surpresa-ajuda').textContent='Nenhuma ação disponível no momento.';return;}
    anterior=acao.ods+':'+acao.titulo;
    api.abrir('#/agir?acao='+encodeURIComponent(anterior));
  });
  doc.addEventListener('ecoa-rota',()=>{limpar();atualizar();});
  doc.addEventListener('visibilitychange',()=>{if(!doc.hidden)atualizar();});
  ambiente.addEventListener('storage',atualizar);
  atualizar();return{atualizar,celebrar,limpar};
}
if(typeof module!=='undefined')module.exports={sortearAcaoEcoa,iniciarVidaEcoa};
else window.ecoaVida=iniciarVidaEcoa(document,window,{
  catalogo:acoes,progresso:()=>calcularProgressoPlano(plano,acoes),
  sequencia:()=>{try{const salvo=localStorage.getItem(chaveDesafio);return salvo?estadoDesafio(validarDesafio(JSON.parse(salvo)),dataLocalDesafio()).sequencia:0;}catch{return null;}},
  abrir:rota=>window.EcoaRouter.navegar(rota)
});
