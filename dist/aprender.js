// Busca local: não envia consultas nem altera preferências ou planos salvos.
function normalizarBuscaGuia(valor) {
  return String(valor).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
}
function encontrarGuias(nomes, consulta) {
  const termo=normalizarBuscaGuia(consulta);
  const numero=termo.match(/^(?:ods\s*)?(\d+)$/);
  return nomes.map((nome,i)=>({nome,ods:i+1})).filter(item=>numero?item.ods===Number(numero[1]):
    termo.split(/\s+/).every(palavra=>normalizarBuscaGuia('ODS '+item.ods+' '+item.nome).includes(palavra))).map(item=>item.ods);
}
function iniciarBuscaGuias(doc,nomes) {
  const $=id=>doc.getElementById(id),campo=$('buscar-ods-guia');
  const cartoes=[...doc.querySelectorAll('#cartoes-guias .guia-escolha')];
  function atualizar(){
    const numeros=encontrarGuias(nomes,campo.value);
    cartoes.forEach(card=>card.hidden=!numeros.includes(Number(card.dataset.ods)));
    $('guias-contagem').textContent=numeros.length===1?'1 objetivo encontrado':`${numeros.length} objetivos encontrados`;
    $('guias-vazio').hidden=numeros.length!==0;
    return numeros;
  }
  function limpar(){campo.value='';atualizar();campo.focus();}
  campo.addEventListener('input',atualizar);
  $('limpar-busca-guias').addEventListener('click',limpar);
  $('guias-mostrar-todos').addEventListener('click',limpar);
  atualizar();return{atualizar,limpar};
}
if(typeof module!=='undefined')module.exports={normalizarBuscaGuia,encontrarGuias,iniciarBuscaGuias};
else iniciarBuscaGuias(document,objetivos);
