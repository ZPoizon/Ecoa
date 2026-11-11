const chaveDesafio = 'ecoa-desafio-v1';
function dataLocalDesafio(data = new Date()) {
  return `${data.getFullYear()}-${String(data.getMonth()+1).padStart(2,'0')}-${String(data.getDate()).padStart(2,'0')}`;
}
function numeroDiaDesafio(data) {
  if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data)) throw Error('Data inválida.');
  const instante = Date.parse(data + 'T00:00:00Z');
  if (!Number.isFinite(instante) || new Date(instante).toISOString().slice(0,10) !== data) throw Error('Data inválida.');
  return instante / 86400000;
}
function validarDesafio(dados) {
  if (!dados || dados.versao !== 1 || !Number.isInteger(dados.ods) || dados.ods < 1 || dados.ods > 17 ||
      !Array.isArray(dados.dias) || dados.dias.length !== 7 || dados.dias.some(d => typeof d !== 'boolean')) throw Error('Desafio salvo inválido.');
  numeroDiaDesafio(dados.inicio);
  return {versao:1,ods:dados.ods,inicio:dados.inicio,dias:[...dados.dias]};
}
function novoDesafio(ods, hoje) { return validarDesafio({versao:1,ods,inicio:hoje,dias:Array(7).fill(false)}); }
function estadoDesafio(dados, hoje) {
  const desafio=validarDesafio(dados);
  const dia=numeroDiaDesafio(hoje)-numeroDiaDesafio(desafio.inicio);
  let sequencia=0;
  // Uma sequência de ontem continua ativa até acabar o dia de hoje.
  let ultimo=dia;
  if (ultimo >= 0 && !desafio.dias[ultimo]) ultimo--;
  if (ultimo >= 0 && ultimo < 7) for(let i=ultimo;i>=0 && desafio.dias[i];i--) sequencia++;
  return {dia,sequencia,concluidas:desafio.dias.filter(Boolean).length,encerrado:dia>=7};
}
function concluirDiaDesafio(dados, hoje, concluido) {
  const desafio=validarDesafio(dados);
  const {dia}=estadoDesafio(desafio,hoje);
  if (dia<0 || dia>6 || typeof concluido !== 'boolean') throw Error('Só é possível marcar a ação da data atual.');
  desafio.dias[dia]=concluido;
  return desafio;
}
function salvarDesafio(armazenamento, dados) {
  const desafio=validarDesafio(dados);
  try { armazenamento.setItem(chaveDesafio,JSON.stringify(desafio)); }
  catch { throw Error('Não foi possível salvar. Permita o armazenamento do navegador e tente novamente. Seu progresso anterior foi mantido.'); }
  return desafio;
}
function roteiroDesafio(ods, catalogo, praticas) {
  const acao=catalogo.find(a=>a.ods===ods && a.custo===0);
  const pratica=praticas[ods-1];
  if (!acao || !pratica) throw Error('Objetivo sem roteiro disponível.');
  return [
    {titulo:acao.titulo,passos:acao.passos},
    {titulo:pratica[0],passos:[pratica[1],pratica[2]]},
    {titulo:'Registre o que você observou',passos:[pratica[3],'Escreva uma frase sobre o que conseguiu fazer, sem precisar compartilhar dados pessoais.']},
    {titulo:'Prepare uma explicação simples',passos:[`Escreva como você fez: ${acao.titulo.toLowerCase()}.`,'Resuma em três passos que outra pessoa consiga entender. Compartilhar é opcional.']},
    {titulo:'Melhore um passo da experiência',passos:[`Releia sua experiência com: ${pratica[0]}`,'Escolha uma dificuldade e escreva uma mudança simples para facilitar a próxima tentativa.']},
    {titulo:'Experimente novamente',passos:[`Se ainda fizer sentido, repita: ${acao.titulo.toLowerCase()}.`,'Aplique a melhoria que você planejou. Se a tarefa já estiver resolvida, confira se o resultado foi mantido e registre isso.']},
    {titulo:'Escolha seu próximo compromisso',passos:['Reveja suas anotações e escolha uma prática que cabe na sua rotina.','Abra as ações deste ODS, salve uma no Meu plano e anote quando pretende fazê-la.']}
  ];
}
if (typeof module !== 'undefined') module.exports={chaveDesafio,dataLocalDesafio,numeroDiaDesafio,validarDesafio,novoDesafio,estadoDesafio,concluirDiaDesafio,salvarDesafio,roteiroDesafio};
