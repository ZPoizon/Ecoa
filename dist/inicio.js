// Resumo derivado do Meu plano existente: sem nova chave nem gravação de dados.
function renderizarResumoInicio(doc,dados) {
  const $=id=>doc.getElementById(id);
  $('inicio-progresso').hidden=dados.salvas===0;
  $('inicio-concluidas').textContent=String(dados.concluidas);
  $('inicio-pendentes').textContent=String(dados.pendentes);
  $('inicio-ods').textContent=String(dados.objetivosAtendidos);
  const barra=$('inicio-barra');
  barra.max=Math.max(1,dados.salvas);barra.value=dados.concluidas;
  const texto=dados.salvas===0?'':dados.pendentes===0
    ? `${dados.concluidas} ${dados.concluidas===1?'ação concluída':'ações concluídas'}. Você pode escolher seu próximo passo.`
    : `${dados.concluidas} de ${dados.salvas} ${dados.salvas===1?'ação concluída':'ações concluídas'}. Continue de onde parou.`;
  $('inicio-progresso-texto').textContent=texto;
  barra.setAttribute('aria-valuetext',`${dados.concluidas} de ${dados.salvas} ${dados.salvas===1?'ação concluída':'ações concluídas'}`);
}
function iniciarInicio(doc,obterDados) {
  function atualizar(dados=obterDados()){renderizarResumoInicio(doc,dados);}
  doc.addEventListener('ecoa-rota',evento=>{if(evento.detail.tela==='inicio')atualizar();});
  atualizar();
  return {atualizar};
}
if(typeof module!=='undefined')module.exports={renderizarResumoInicio,iniciarInicio};
else window.ecoaInicio=iniciarInicio(document,()=>calcularProgressoPlano(plano,acoes));
