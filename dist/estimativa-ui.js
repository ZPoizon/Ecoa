function iniciarEstimativa(documento, modelos, calcular, formatar, abrirAcao) {
  const seletor=documento.querySelector('#estimativa-tipo');
  const formulario=documento.querySelector('#estimativa-form');
  const campos=documento.querySelector('#estimativa-campos');
  const saida=documento.querySelector('#estimativa-resultado');
  const erro=documento.querySelector('#estimativa-erro');
  function limparResultado(){saida.textContent='';erro.textContent='';}
  function atualizarModelo() {
    const modelo=modelos[seletor.value];
    limparResultado();campos.replaceChildren();
    documento.querySelector('#estimativa-hipoteses').textContent=modelo.limite;
    documento.querySelector('#estimativa-referencia').textContent=modelo.referencia;
    const fonte=documento.querySelector('#estimativa-fonte');fonte.href=modelo.url;fonte.textContent=modelo.fonte;
    modelo.campos.forEach(campo=>{
      const grupo=documento.createElement('div');
      const rotulo=documento.createElement('label');rotulo.htmlFor='estimativa-'+campo.id;rotulo.textContent=campo.rotulo;
      const input=documento.createElement('input');input.id=rotulo.htmlFor;input.name=campo.id;input.type='number';
      input.min=campo.min;input.max=campo.max;input.step=campo.inteiro?'1':'any';input.required=true;
      input.setAttribute('aria-describedby','estimativa-hipoteses estimativa-erro');
      grupo.append(rotulo,input);campos.append(grupo);
    });
  }
  formulario.addEventListener('submit',evento=>{
    evento.preventDefault();limparResultado();
    try {
      const valores={};modelos[seletor.value].campos.forEach(c=>{valores[c.id]=documento.querySelector('#estimativa-'+c.id).value;});
      const resultado=calcular(seletor.value,valores);
      saida.textContent=formatar(resultado)+' Cálculo: '+resultado.formula+'. É uma simulação educativa, não economia medida. Não é somada ao progresso ou aos selos.';
      saida.focus();
    } catch(e) {erro.textContent=e.message;erro.focus();}
  });
  formulario.addEventListener('input',limparResultado);
  seletor.addEventListener('change',atualizarModelo);
  documento.querySelector('#estimativa-abrir').addEventListener('click',()=>abrirAcao(modelos[seletor.value]));
  atualizarModelo();
}
if(typeof module!=='undefined')module.exports={iniciarEstimativa};
else iniciarEstimativa(document,modelosEstimativa,calcularEstimativa,formatarEstimativa,modelo=>{
  const acao=acoes.find(a=>a.ods===modelo.ods&&a.titulo===modelo.acao);
  if(!acao)return;
  form.reset();encontradas=[acao];indice=0;mostrar();
});
