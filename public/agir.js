// Um único controlador para atalhos e assuntos; preserva os demais filtros.
function iniciarAgir(doc,buscarAcao,atualizarOds,relogio=globalThis) {
  const $=id=>doc.querySelector('#'+id),formulario=$('filtros');
  const campos=formulario.elements;
  const tempos=[...formulario.querySelectorAll('button[data-tempo]')];
  const assuntos=[...formulario.querySelectorAll('button[data-assunto]')];
  const objetivos=[...formulario.querySelectorAll('input[name="ods"]')];
  const marcados=()=>objetivos.filter(c=>c.checked).map(c=>c.value);
  const minutos=()=>campos.tempo.value===''?null:Number(campos.tempo.value)*(campos.unidade.value==='h'?60:1);
  function atualizar(){
    const escolhidos=marcados();
    tempos.forEach(b=>b.setAttribute('aria-pressed',String(minutos()===Number(b.dataset.tempo)*(b.dataset.unidade==='h'?60:1))));
    $('so-gratis').setAttribute('aria-pressed',String(campos.custo.value!==''&&Number(campos.custo.value)===0));
    $('agir-na-rua').setAttribute('aria-pressed',String(campos.local.value==='Na rua'));
    assuntos.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.assunto.split(',').every(n=>escolhidos.includes(n)))));
    $('agir-filtros-resumo').textContent=escolhidos.length?`${escolhidos.length} ${escolhidos.length===1?'objetivo selecionado':'objetivos selecionados'}`:'Todos os 17 objetivos';
  }
  function aplicar(){atualizarOds();atualizar();if(formulario.reportValidity())buscarAcao();}
  tempos.forEach(b=>b.addEventListener('click',()=>{
    const mesmo=minutos()===Number(b.dataset.tempo)*(b.dataset.unidade==='h'?60:1);
    campos.tempo.value=mesmo?'':b.dataset.tempo;campos.unidade.value=b.dataset.unidade||'min';aplicar();
  }));
  $('so-gratis').addEventListener('click',()=>{campos.custo.value=campos.custo.value!==''&&Number(campos.custo.value)===0?'':'0';aplicar();});
  $('agir-na-rua').addEventListener('click',()=>{campos.local.value=campos.local.value==='Na rua'?'':'Na rua';aplicar();});
  assuntos.forEach(b=>b.addEventListener('click',()=>{
    const grupo=b.dataset.assunto.split(','),desmarcar=grupo.every(n=>marcados().includes(n));
    objetivos.forEach(c=>{if(grupo.includes(c.value))c.checked=!desmarcar;});aplicar();
  }));
  formulario.addEventListener('input',atualizar);formulario.addEventListener('change',atualizar);
  formulario.addEventListener('reset',()=>{resultado(false);relogio.queueMicrotask(atualizar);});
  $('agir-recomecar').addEventListener('click',()=>{formulario.reset();aplicar();});
  function resultado(vazio){$('agir-vazio').hidden=!vazio;}
  atualizar();
  return {atualizar,resultado};
}
if(typeof module!=='undefined')module.exports={iniciarAgir};
else window.EcoaAgir=iniciarAgir(document,buscar,atualizarSelecao);
