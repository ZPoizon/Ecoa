const selecionarDesafio=document.querySelector('#desafio-ods');
const listaDesafio=document.querySelector('#desafio-dias');
const resumoDesafio=document.querySelector('#desafio-resumo');
const avisoDesafio=document.querySelector('#desafio-aviso');
const confirmarDesafio=document.querySelector('#desafio-confirmar');
let desafioAtual=null;
let armazenamentoDesafio;
let odsPendente;
objetivos.forEach((nome,i)=>selecionarDesafio.add(new Option(`ODS ${i+1} — ${nome}`,i+1)));
try {
  armazenamentoDesafio=localStorage;
  const salvo=armazenamentoDesafio.getItem(chaveDesafio);
  if(salvo) desafioAtual=validarDesafio(JSON.parse(salvo));
} catch { avisoDesafio.textContent='Não foi possível ler o desafio salvo. Você pode iniciar um novo desafio; seu Meu plano não foi alterado.'; }
if(desafioAtual) selecionarDesafio.value=desafioAtual.ods;

function renderizarDesafio() {
  listaDesafio.replaceChildren();
  if(!desafioAtual) {resumoDesafio.textContent='Escolha um objetivo e comece hoje.';return;}
  const hoje=dataLocalDesafio();
  const estado=estadoDesafio(desafioAtual,hoje);
  resumoDesafio.textContent=`ODS ${desafioAtual.ods} · ${objetivos[desafioAtual.ods-1]}. ${estado.concluidas} de 7 dias concluídos. Sequência atual: ${estado.sequencia} ${estado.sequencia === 1 ? 'dia' : 'dias'}.` +
    (estado.encerrado?' Este desafio terminou. Você pode começar outro.':estado.dia<0?' A data do aparelho é anterior ao início do desafio. Confira o relógio.':'');
  roteiroDesafio(desafioAtual.ods,acoes,praticasOds).forEach((acao,i)=>{
    const linha=document.createElement('li');
    const cabecalho=document.createElement('h3');
    cabecalho.textContent=`Dia ${i+1} · ${acao.titulo}`;
    const situacao=document.createElement('p');
    const dia=estado.dia;
    situacao.className='hint';
    situacao.textContent=desafioAtual.dias[i]?'Concluído':i===dia?'Disponível hoje':i>dia?'Disponível nos próximos dias':'Dia encerrado sem marcação';
    const passos=document.createElement('ol');
    acao.passos.forEach(texto=>{const passo=document.createElement('li');passo.textContent=texto;passos.append(passo);});
    const rotulo=document.createElement('label');
    const caixa=document.createElement('input');caixa.type='checkbox';caixa.checked=desafioAtual.dias[i];caixa.disabled=i!==dia;
    caixa.addEventListener('change',()=>{
      try {
        if(estadoDesafio(desafioAtual,dataLocalDesafio()).dia!==i) throw Error('O dia mudou. Confira a ação disponível para hoje.');
        desafioAtual=salvarDesafio(armazenamentoDesafio,concluirDiaDesafio(desafioAtual,dataLocalDesafio(),caixa.checked));
        avisoDesafio.textContent=caixa.checked?'Progresso salvo. Uma pequena ação que ecoa!':'Marcação desfeita.';
      } catch(e){avisoDesafio.textContent=e.message;}
      renderizarDesafio();
      document.querySelector('#desafio-resumo').focus();
    });
    rotulo.append(caixa,` Concluí a ação do dia ${i+1}`);
    linha.append(cabecalho,situacao,passos,rotulo);listaDesafio.append(linha);
  });
}
function iniciarNovoDesafio() {
  try {
    desafioAtual=salvarDesafio(armazenamentoDesafio,novoDesafio(odsPendente,dataLocalDesafio()));
    avisoDesafio.textContent='Desafio iniciado! A primeira ação está disponível hoje.';
    confirmarDesafio.hidden=true;
    renderizarDesafio();
    resumoDesafio.focus();
  } catch(e){avisoDesafio.textContent=e.message;}
}
document.querySelector('#desafio-iniciar').addEventListener('click',()=>{
  odsPendente=Number(selecionarDesafio.value);
  if(desafioAtual) {confirmarDesafio.hidden=false;document.querySelector('#desafio-substituir').focus();}
  else iniciarNovoDesafio();
});
document.querySelector('#desafio-substituir').addEventListener('click',iniciarNovoDesafio);
document.querySelector('#desafio-cancelar').addEventListener('click',()=>{confirmarDesafio.hidden=true;document.querySelector('#desafio-iniciar').focus();});
document.querySelector('#desafio-acoes').addEventListener('click',()=>{
  form.reset();opcoes.querySelector(`input[value="${desafioAtual?.ods || selecionarDesafio.value}"]`).checked=true;atualizarSelecao();buscar();
});
// Recalcular pela data local ao voltar à aba ou após a meia-noite, sem notificações.
document.addEventListener('visibilitychange',()=>{if(!document.hidden) renderizarDesafio();});
let ultimaDataDesafio=dataLocalDesafio();
setInterval(()=>{const hoje=dataLocalDesafio();if(hoje!==ultimaDataDesafio){ultimaDataDesafio=hoje;renderizarDesafio();}},60000);
renderizarDesafio();
