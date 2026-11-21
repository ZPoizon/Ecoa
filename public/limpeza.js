// A folha usa os mesmos campos e eventos; não copia filtros nem altera armazenamento.
function iniciarFolhaFiltros(doc) {
  const folha=doc.getElementById('folha-filtros');
  const abrir=doc.getElementById('abrir-filtros');
  const form=doc.getElementById('filtros');
  const fechar=()=>{if(folha.open)folha.close();};
  abrir.addEventListener('click',()=>{if(!folha.open)folha.showModal();});
  doc.getElementById('fechar-filtros').addEventListener('click',fechar);
  // O dialog nativo restaura o foco ao fechar, inclusive por Escape.
  // Fecha antes da busca para que o foco possa ir ao resultado fora do modal.
  form.addEventListener('submit',fechar,true);
  form.addEventListener('invalid',()=>{if(!folha.open)folha.showModal();},true);
  doc.addEventListener('ecoa-rota',fechar);
  return {fechar};
}
if(typeof module!=='undefined')module.exports={iniciarFolhaFiltros};
else iniciarFolhaFiltros(document);
