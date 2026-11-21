function iniciarLembretes(doc,ambiente,catalogo,obterPlano,api) {
  const $=id=>doc.getElementById(id);let ocupado=false,bloqueado=false;
  const aviso=t=>{$('lembrete-status').textContent=t;};
  const avisoNotificacao=t=>{const el=$('notificacoes-status');if(el)el.textContent=t;else aviso(t);};
  const criar=(tag,texto)=>{const el=doc.createElement(tag);el.textContent=texto;return el;};
  function ler(){return api.lerLembretes(ambiente.localStorage,catalogo);}
  function gravar(dados){return api.salvarLembretes(ambiente.localStorage,dados,catalogo);}
  function atualizar(){
    try{
      let dados=ler(),plano=obterPlano();const limpos=api.reconciliarLembretes(dados,plano);
      if(limpos.itens.length!==dados.itens.length)dados=gravar(limpos);
      const seletor=$('lembrete-acao'),escolhida=seletor.value;seletor.replaceChildren();
      const pendentes=catalogo.filter(a=>plano.get(a.ods+':'+a.titulo)===false);
      const guia=criar('option',pendentes.length?'Escolha uma ação do seu plano':'Nenhuma ação pendente no plano');guia.value='';guia.disabled=true;seletor.append(guia);
      pendentes.forEach(a=>{const o=criar('option',a.titulo);o.value=a.ods+':'+a.titulo;seletor.append(o);});
      seletor.value=pendentes.some(a=>a.ods+':'+a.titulo===escolhida)?escolhida:'';
      const vazio=!pendentes.length;
      if($('lembretes'))$('lembretes').hidden=!plano.size;
      seletor.disabled=vazio;$('lembrete-quando').disabled=vazio;$('lembrete-salvar').disabled=vazio;
      $('lembrete-form').setAttribute('aria-disabled',String(vazio));
      $('lembrete-salvar-ajuda').textContent=vazio?'Salve uma ação pendente no plano para criar um lembrete.':'Escolha uma ação e uma data futura para salvar o lembrete.';
      $('lembrete-vazio').hidden=true;
      $('lembrete-permissao').textContent=dados.notificacoes?(ambiente.Notification?.permission==='granted'?'Notificações ativadas neste navegador.':'Notificações bloqueadas ou indisponíveis. Os avisos na página continuam funcionando.'):'Notificações desativadas. Os avisos aparecem somente na página.';
      $('lembrete-ativar').hidden=dados.notificacoes&&ambiente.Notification?.permission==='granted';$('lembrete-desativar').hidden=!dados.notificacoes;
      $('lembrete-lista').replaceChildren();
      for(const item of dados.itens){
        const acao=catalogo.find(a=>a.ods+':'+a.titulo===item.chave),li=criar('li','');
        const estado=item.quando<=Date.now()?'Horário chegou':'Agendado';
        li.append(criar('strong',acao.titulo),criar('p',estado+' · '+new Date(item.quando).toLocaleString('pt-BR')));
        const cancelar=criar('button','Cancelar lembrete');cancelar.type='button';cancelar.className='secondary';cancelar.setAttribute('aria-label','Cancelar lembrete: '+acao.titulo);
        cancelar.addEventListener('click',()=>{try{const atual=ler();gravar({...atual,itens:atual.itens.filter(x=>x.chave!==item.chave)});atualizar();aviso('Lembrete cancelado. Se importou no calendário, remova também por lá.');$('lembrete-status').focus();}catch(e){aviso(e.message);}});
        const calendario=criar('button','Adicionar ao calendário');calendario.type='button';calendario.className='calendario-principal';
        calendario.addEventListener('click',()=>{try{const texto=api.calendarioLembrete(acao,item.quando);const url=ambiente.URL.createObjectURL(new Blob([texto],{type:'text/calendar;charset=utf-8'}));const a=criar('a','');a.href=url;a.download='ecoa-lembrete.ics';doc.body.append(a);a.click();a.remove();ambiente.setTimeout(()=>ambiente.URL.revokeObjectURL(url),1000);aviso('Abra o arquivo no calendário e confirme a importação e o alerta. Alterações aqui não atualizam o calendário.');}catch{aviso('Não foi possível gerar o calendário.');}});
        li.append(calendario,cancelar);$('lembrete-lista').append(li);
      }
      bloqueado=false;
    }catch(e){bloqueado=true;$('lembrete-salvar').disabled=true;$('lembrete-acao').disabled=true;$('lembrete-quando').disabled=true;$('lembrete-form').setAttribute('aria-disabled','true');$('lembrete-salvar-ajuda').textContent='Não foi possível ler os lembretes salvos; recarregue a página para tentar novamente.';aviso(e.message||'Não foi possível ler os lembretes. Nenhum dado foi apagado.');}
  }
  $('lembrete-form').addEventListener('submit',e=>{e.preventDefault();if(bloqueado)return;try{gravar(api.agendarLembrete(ler(),$('lembrete-acao').value,api.horarioLembrete($('lembrete-quando').value),obterPlano()));atualizar();aviso('Lembrete preparado. Use Adicionar ao calendário e confirme o alerta no aplicativo.');}catch(e){aviso(e.message);}$('lembrete-status').focus();});
  $('lembrete-ativar').addEventListener('click',async()=>{
    $('lembrete-ativar').disabled=true;
    try{const estado=await api.permitirNotificacoes(ambiente);if(estado==='granted'){gravar({...ler(),notificacoes:true});avisoNotificacao('Notificações ativadas. O navegador pode atrasar avisos em segundo plano.');}else avisoNotificacao(estado==='denied'?'Permissão bloqueada. Você pode alterá-la nas configurações do navegador.':estado==='indisponivel'?'Este navegador não oferece notificações. Use os avisos na página ou o calendário.':'Permissão não concedida. Nenhuma notificação foi ativada.');atualizar();}catch{avisoNotificacao('Não foi possível ativar notificações. Os avisos na página continuam disponíveis.');}finally{$('lembrete-ativar').disabled=false;}
  });
  $('lembrete-desativar').addEventListener('click',()=>{try{gravar({...ler(),notificacoes:false});atualizar();avisoNotificacao('Notificações do Ecoa desativadas. Seus lembretes continuam na página.');}catch(e){avisoNotificacao(e.message);}});
  async function verificar(){
    if(ocupado||bloqueado)return;ocupado=true;
    const executar=async()=>{
      let dados=ler();const vencidos=api.lembretesVencidos(dados,obterPlano());if(!vencidos.length)return;
      // Marca antes de notificar. O aviso permanece na lista mesmo se o SO rejeitar a notificação.
      dados=gravar({...dados,itens:dados.itens.map(x=>vencidos.some(v=>v.chave===x.chave)?{...x,avisado:true}:x)});
      atualizar();aviso('Hora de agir: '+vencidos.map(x=>x.chave.slice(x.chave.indexOf(':')+1)).join('; ')+'.');
      if(dados.notificacoes)for(const item of vencidos){try{const a=catalogo.find(a=>a.ods+':'+a.titulo===item.chave);if(!await api.notificarLembrete(ambiente,a))aviso('Seu lembrete chegou. A notificação não está disponível; consulte a lista abaixo.');}catch{aviso('Seu lembrete chegou, mas o navegador não exibiu a notificação. Consulte a lista abaixo.');}}
    };
    try{if(ambiente.navigator.locks)await ambiente.navigator.locks.request('ecoa-lembretes',executar);else await executar();}catch(e){aviso(e.message);}finally{ocupado=false;}
  }
  ambiente.setInterval(verificar,15000);
  doc.addEventListener('visibilitychange',()=>{if(!doc.hidden){atualizar();verificar();}});
  ambiente.addEventListener('storage',e=>{if(e.key===api.chaveLembretes)atualizar();});
  atualizar();verificar();return {atualizar,verificar};
}
if(typeof module!=='undefined')module.exports={iniciarLembretes};
else window.ecoaLembretes=iniciarLembretes(document,window,acoes,()=>plano,{chaveLembretes,lerLembretes,salvarLembretes,horarioLembrete,agendarLembrete,lembretesVencidos,reconciliarLembretes,permitirNotificacoes,notificarLembrete,calendarioLembrete});
