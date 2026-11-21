// Navegação sem recriar componentes ou ler/escrever localStorage.
const telasEcoa = {inicio:'Início',agir:'Agir',aprender:'Aprender','na-cidade':'Na cidade','meu-espaco':'Meu espaço'};
const atalhosEcoa = {
  inicio:'#/inicio',buscar:'#/agir',busca:'#/agir',filtros:'#/agir',explorar:'#/agir',rapidas:'#/agir',
  resultado:'#/agir',titulo:'#/agir','painel-ods':'#/agir','area-ods':'#/agir',onu:'#/agir',
  estimativa:'#/agir/calcular',quiz:'#/aprender',guias:'#/aprender','cartoes-guias':'#/aprender',
  'na-minha-cidade':'#/na-cidade','cidade-lista':'#/na-cidade','cidade-form':'#/na-cidade',
  desafio:'#/meu-espaco/desafio','meu-plano':'#/meu-espaco','plano-titulo':'#/meu-espaco',
  'exportar-json':'#/meu-espaco/configuracoes','importar-json':'#/meu-espaco/configuracoes','progresso-titulo':'#/meu-espaco/conquistas','progresso-grafico':'#/meu-espaco/conquistas',conquistas:'#/meu-espaco/conquistas','progresso-selos':'#/meu-espaco/conquistas',
  'preferencia-tema':'#/meu-espaco/configuracoes',lembretes:'#/meu-espaco'
};
function resolverRotaEcoa(hash) {
  let valor=hash || '#/inicio',alvo=null;
  if(valor.startsWith('#acao='))valor='#/agir?acao='+valor.slice(6);
  if(Object.hasOwn(atalhosEcoa,valor.slice(1))){alvo=valor.slice(1);valor=atalhosEcoa[alvo];}
  const [caminho,consulta='']=valor.slice(1).split('?');
  const partes=caminho.split('/').filter(Boolean),tela=partes[0],sub=partes[1];
  const ods=tela==='aprender'&&/^ods-(?:[1-9]|1[0-7])$/.test(sub||'')?Number(sub.slice(4)):null;
  const valida=Object.hasOwn(telasEcoa,tela)&&partes.length<=2&&(!sub ||
    tela==='agir'&&sub==='calcular'||!!ods||tela==='meu-espaco'&&['desafio','conquistas','configuracoes'].includes(sub));
  if(!valida)return {tela:'inicio',hash:'#/inicio',titulo:'Início | Ecoa',ods:null,sub:null,acao:null,alvo:null};
  const parametros=new URLSearchParams(consulta);
  const acao=tela==='agir'&&!sub?parametros.get('acao'):null;
  const canonico='#/'+tela+(sub?'/'+sub:'')+(acao!==null?'?acao='+encodeURIComponent(acao):'');
  return {tela,hash:canonico,titulo:(ods?'ODS '+ods:sub==='calcular'?'Calcular impacto':tela==='meu-espaco'&&sub?({desafio:'Desafio de 7 dias',conquistas:'Conquistas',configuracoes:'Configurações'}[sub]):telasEcoa[tela])+' | Ecoa',ods,sub:sub||null,acao,alvo};
}
function atualizarAbasEspaco(doc,sub){
 const selecionada=['desafio','conquistas','configuracoes'].includes(sub)?sub:'plano';
 for(const [nome,id] of [['plano','meu-plano'],['desafio','desafio'],['conquistas','espaco-conquistas'],['configuracoes','espaco-configuracoes']]){
  const ativo=nome===selecionada,tab=doc.getElementById('espaco-tab-'+nome);
  doc.getElementById(id).hidden=!ativo;tab.setAttribute('aria-selected',String(ativo));tab.tabIndex=ativo?0:-1;
 }
}
function iniciarRotasEcoa(doc,janela,adaptadores={}) {
  const $=id=>doc.getElementById(id);
  let ultima=null,usandoPonteiro=false;
  doc.addEventListener('pointerdown',()=>{usandoPonteiro=true;},true);
  doc.addEventListener('keydown',()=>{usandoPonteiro=false;doc.activeElement?.removeAttribute('data-foco-toque');},true);
  function aplicar(hash,forcar=false) {
    const rota=resolverRotaEcoa(hash);
    if(janela.location.hash!==rota.hash)janela.history.replaceState(null,'',rota.hash);
    if(!forcar&&ultima===rota.hash)return rota;
    ultima=rota.hash;
    doc.querySelectorAll('[data-tela]').forEach(el=>{el.hidden=el.dataset.tela!==rota.tela;});
    doc.querySelectorAll('[data-nav]').forEach(el=>{
      if(el.dataset.nav===rota.tela)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');
    });
    atualizarAbasEspaco(doc,rota.sub);
    const calcular=rota.sub==='calcular';
    $('painel-buscar').hidden=calcular;$('painel-calcular').hidden=!calcular;
    for(const [id,selecionada] of [['aba-buscar',!calcular],['aba-calcular',calcular]]){
      $(id).setAttribute('aria-selected',String(selecionada));$(id).tabIndex=selecionada?0:-1;
    }
    doc.querySelectorAll('[data-voltar]').forEach(el=>{el.hidden=!rota.sub;});
    // Os guias completos aparecem somente em suas subtelas.
    $('quiz').hidden=!!rota.ods;
    $('aprender-filtros').hidden=!!rota.ods;
    $('cartoes-guias').hidden=!!rota.ods;
    $('conteudo-guia').hidden=!rota.ods;$('buscar-guia').hidden=!rota.ods;
    doc.querySelector('.guia-navegacao').hidden=!rota.ods;
    if(rota.ods){
      adaptadores.abrirGuia?.(rota.ods);
      $('ods-anterior').href='#/aprender/ods-'+(rota.ods===1?17:rota.ods-1);
      $('ods-proximo').href='#/aprender/ods-'+(rota.ods===17?1:rota.ods+1);
    }
    if(rota.acao!==null)adaptadores.abrirAcao?.(rota.acao);
    doc.title=rota.titulo;
    const alvo=rota.ods?$('guia-nome'):rota.sub==='desafio'?$('desafio-titulo'):
      rota.sub==='conquistas'?$('conquistas-titulo'):rota.sub==='configuracoes'?$('configuracoes-titulo'):$('tela-'+rota.tela+'-titulo');
    if(rota.alvo==='preferencia-tema')doc.querySelector('.leitura').open=true;
    if(alvo){alvo.setAttribute('data-foco-toque',String(usandoPonteiro));alvo.tabIndex=-1;alvo.focus({preventScroll:true});}
    janela.scrollTo({top:0,left:0,behavior:'instant'});

    if(rota.alvo&&rota.alvo!=='inicio'){const destino=$(rota.alvo);abrirDetalhes(destino);destino?.scrollIntoView({block:'start',behavior:'instant'});}
    doc.dispatchEvent(new janela.CustomEvent('ecoa-rota',{detail:rota}));
    return rota;
  }
  function abrirDetalhes(alvo){
    let detalhe=alvo?.closest?.('details');
    while(detalhe){detalhe.open=true;detalhe=detalhe.parentElement?.closest('details');}
  }
  function navegar(hash){
    const rota=resolverRotaEcoa(hash);
    if(janela.location.hash!==rota.hash)janela.history.pushState(null,'',rota.hash);
    return aplicar(hash,true);
  }
  function abrirBusca(){
    const rota=resolverRotaEcoa(janela.location.hash);
    if(rota.tela!=='agir'||rota.sub)navegar('#/agir');
  }
  doc.addEventListener('click',evento=>{
    if(evento.defaultPrevented||evento.button>0||evento.ctrlKey||evento.metaKey||evento.shiftKey||evento.altKey)return;
    const el=evento.target.closest('a[href],button[data-rota]');if(!el||el.target==='_blank'||el.hasAttribute('download'))return;
    const hash=el.dataset.rota||el.getAttribute('href');
    if(hash==='#conteudo'){
      evento.preventDefault();const rota=resolverRotaEcoa(janela.location.hash);$('tela-'+rota.tela+'-titulo').focus();return;
    }
    if(!hash?.startsWith('#'))return;
    // Também suporta âncoras legadas internas não cadastradas explicitamente.
    if(!hash.startsWith('#/')&&!hash.startsWith('#acao=')&&!Object.hasOwn(atalhosEcoa,hash.slice(1))){
      const alvo=$(hash.slice(1)),tela=alvo?.closest('[data-tela]');
      if(tela){evento.preventDefault();navegar('#/'+tela.dataset.tela);abrirDetalhes(alvo);alvo.scrollIntoView();}return;
    }
    evento.preventDefault();navegar(hash);
  });
  doc.querySelector('[role="tablist"]').addEventListener('keydown',evento=>{
    const tabs=[$('aba-buscar'),$('aba-calcular')];const i=tabs.indexOf(evento.target);
    if(i<0||!['ArrowLeft','ArrowRight','Home','End'].includes(evento.key))return;
    evento.preventDefault();const proxima=evento.key==='Home'?tabs[0]:evento.key==='End'?tabs[1]:tabs[1-i];
    navegar(proxima.dataset.rota);proxima.focus();
  });
  $('espaco-abas').addEventListener('keydown',evento=>{
    const tabs=['plano','desafio','conquistas','configuracoes'].map(n=>$('espaco-tab-'+n));
    const i=tabs.indexOf(evento.target);if(i<0||!['ArrowLeft','ArrowRight','Home','End'].includes(evento.key))return;
    evento.preventDefault();const indice=evento.key==='Home'?0:evento.key==='End'?tabs.length-1:(i+(evento.key==='ArrowLeft'?-1:1)+tabs.length)%tabs.length;
    navegar(tabs[indice].dataset.rota);tabs[indice].focus();
  });
  janela.addEventListener('hashchange',()=>aplicar(janela.location.hash));
  janela.addEventListener('popstate',()=>aplicar(janela.location.hash));
  aplicar(janela.location.hash,true);
  return {navegar,abrirBusca,aplicar};
}
if(typeof module!=='undefined')module.exports={resolverRotaEcoa,iniciarRotasEcoa,atalhosEcoa,atualizarAbasEspaco};
else {
  // Todos os módulos defer já foram inicializados; os nós e seus eventos permanecem vivos.
  window.EcoaRouter=iniciarRotasEcoa(document,window,{
    abrirGuia(ods){seletorGuia.value=String(ods);preencherGuia();},
    abrirAcao(chave){const acao=acoes.find(a=>a.ods+':'+a.titulo===chave);
      if(acao){form.reset();encontradas=[acao];indice=0;mostrar();}
      else{status.textContent='Esta ação não foi encontrada. Use a busca para escolher outra sugestão.';}
    }
  });
}
