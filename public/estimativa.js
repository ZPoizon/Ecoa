// Cenários educativos do Ecoa; não medem consumo nem certificam impacto.
const modelosEstimativa = {
  agua: {
    ods:6, acao:'Identifique desperdício na pia',
    fonte:'CASAN — boas práticas para uso da água (08/12/2022)',
    url:'https://www.casan.com.br/noticia/index/url/casan-orienta-boas-praticas-para-uso-da-agua',
    referencia:'A CASAN apresenta uma referência de até 46 litros por dia para uma torneira gotejando. O Ecoa multiplica esse cenário pela quantidade de torneiras e pelos dias informados.',
    limite:'Só identificar a goteira não economiza esse volume. A simulação pressupõe que o gotejamento foi totalmente eliminado e não voltou no período. Vazão e pressão variam; 46 L/dia não é uma medição da sua torneira nem um limite para todo tipo de vazamento.',
    campos:[
      {id:'quantidade',rotulo:'Torneiras com gotejamento eliminado',min:1,max:20,inteiro:true},
      {id:'dias',rotulo:'Dias sem gotejamento após o conserto',min:0,max:365,inteiro:true}
    ]
  },
  energia: {
    ods:7, acao:'Aproveite a luz natural',
    fonte:'AGEMS — cálculo do consumo dos aparelhos (23/07/2015)',
    url:'https://www.agems.ms.gov.br/gastos-com-energia-eletrica-podem-ser-controlados-estimando-o-consumo-dos-aparelhos/',
    referencia:'A AGEMS calcula energia em kWh multiplicando potência em watts, horas por dia e dias, dividindo por 1.000. O Ecoa aplica essa fórmula ao tempo em que lâmpadas iguais deixam de ficar acesas.',
    limite:'Use a potência real da etiqueta, não a potência equivalente de uma lâmpada LED. A estimativa pressupõe lâmpadas iguais e que a luz ficou apagada pelo tempo informado graças à claridade natural. Não inclui tarifas, impostos, emissões ou outras mudanças no consumo.',
    campos:[
      {id:'potencia',rotulo:'Potência de cada lâmpada (W)',min:0.1,max:2000,inteiro:false},
      {id:'quantidade',rotulo:'Quantidade de lâmpadas iguais',min:1,max:100,inteiro:true},
      {id:'horas',rotulo:'Horas apagadas por dia',min:0,max:24,inteiro:false},
      {id:'dias',rotulo:'Quantidade de dias',min:0,max:365,inteiro:true}
    ]
  }
};
// Novos cenários usam as mesmas fontes verificadas, sem alterar o catálogo.
modelosEstimativa.banho = {
  ods:6, acao:null,
  fonte:modelosEstimativa.agua.fonte, url:modelosEstimativa.agua.url,
  referencia:'A CASAN usa uma referência de 10 litros por minuto sob o chuveiro. O Ecoa aplica essa vazão aos minutos reduzidos e ao número de banhos informados.',
  limite:'Cenário hipotético com vazão constante de 10 L/min. A vazão do seu chuveiro pode ser diferente. Informe minutos a menos em cada banho e o total de banhos no período escolhido; não é economia medida nem cálculo da energia do chuveiro.',
  campos:[
    {id:'antes',rotulo:'Duração anterior de cada banho (minutos)',min:0,max:120,inteiro:false},
    {id:'depois',rotulo:'Nova duração de cada banho (minutos)',min:0,max:120,inteiro:false},
    {id:'banhos',rotulo:'Total de banhos com essa redução no período',min:0,max:1000,inteiro:true}
  ]
};
modelosEstimativa.aparelhos = {
  ods:7, acao:null,
  fonte:modelosEstimativa.energia.fonte, url:modelosEstimativa.energia.url,
  referencia:'Fórmula de energia da AGEMS: potência em watts × horas de uso × dias ÷ 1.000. Aqui ela é aplicada ao tempo de uso reduzido de aparelhos iguais.',
  limite:'Use a potência elétrica real de funcionamento e aparelhos de potência aproximadamente constante. A potência nominal máxima não estima bem geladeiras e equipamentos que alternam ciclos ou níveis de consumo. Não inclui standby, tarifas ou emissões. Não pressupõe desligar equipamentos que precisam permanecer ligados.',
  campos:[
    {id:'potencia',rotulo:'Potência de cada aparelho em funcionamento (W)',min:0.1,max:10000,inteiro:false},
    {id:'quantidade',rotulo:'Quantidade de aparelhos iguais',min:1,max:100,inteiro:true},
    {id:'horas',rotulo:'Horas de uso reduzidas por dia',min:0,max:24,inteiro:false},
    {id:'dias',rotulo:'Quantidade de dias',min:0,max:365,inteiro:true}
  ]
};
modelosEstimativa.alimentos = {
  ods:2, acao:'Planeje uma refeição antes de comprar', registro:true,
  fonte:'Origem dos dados: quantidade informada por você.', url:null,
  referencia:'Conversão de unidade: 1.000 gramas = 1 quilograma. Não há fator ambiental aplicado nem projeção para outros dias.',
  limite:'Informe somente o peso dos alimentos que você de fato aproveitou e que, segundo sua avaliação, seriam descartados. Não inclua embalagem nem conte a mesma porção duas vezes. Esta quantidade é uma declaração sua, não uma medição verificada pelo Ecoa.',
  campos:[{id:'gramas',rotulo:'Peso total dos alimentos aproveitados (g)',min:0,max:1000000,inteiro:false}]
};
modelosEstimativa.oleo = {
  ods:14, acao:'Evite jogar óleo usado pelo ralo', registro:true,
  fonte:'Origem dos dados: quantidade informada por você.', url:null,
  referencia:'Conversão de unidade: 1.000 mililitros = 1 litro. Não convertemos óleo coletado em litros de água protegida ou outros benefícios não medidos.',
  limite:'Informe o volume de óleo usado que já foi entregue a um ponto de coleta que o aceite, não o volume ainda guardado em casa. O resultado é uma quantidade declarada por você, sem verificação externa.',
  campos:[{id:'mililitros',rotulo:'Volume total de óleo entregue à coleta (mL)',min:0,max:1000000,inteiro:false}]
};
function numeroEstimativa(valor, campo) {
  if ((typeof valor !== 'number' && typeof valor !== 'string') || String(valor).trim()==='') throw Error(`Preencha: ${campo.rotulo}.`);
  const numero=Number(String(valor).trim().replace(',','.'));
  if(!Number.isFinite(numero)||numero<campo.min||numero>campo.max||(campo.inteiro&&!Number.isInteger(numero))) {
    throw Error(`${campo.rotulo}: informe ${campo.inteiro?'um número inteiro':'um número'} entre ${campo.min} e ${campo.max}.`);
  }
  return numero;
}
function calcularEstimativa(tipo, valores) {
  if(!Object.hasOwn(modelosEstimativa,tipo)) throw Error('Escolha uma ação disponível para simular.');
  const modelo=modelosEstimativa[tipo];
  const dados=Object.fromEntries(modelo.campos.map(c=>[c.id,numeroEstimativa(valores?.[c.id],c)]));
  if(tipo==='agua') return {valor:46*dados.quantidade*dados.dias,unidade:'L',formula:`46 L/dia × ${dados.quantidade} torneiras × ${dados.dias} dias`,tipo};
  if(tipo==='banho') {
    if(dados.depois>dados.antes) throw Error('A nova duração deve ser igual ou menor que a anterior para simular uma redução.');
    return {valor:(dados.antes-dados.depois)*10*dados.banhos,unidade:'L',formula:`(${dados.antes} − ${dados.depois}) min × 10 L/min × ${dados.banhos} banhos`,tipo};
  }
  if(tipo==='alimentos') return {valor:dados.gramas/1000,unidade:'kg',formula:`${dados.gramas} g ÷ 1.000`,tipo};
  if(tipo==='oleo') return {valor:dados.mililitros/1000,unidade:'L',formula:`${dados.mililitros} mL ÷ 1.000`,tipo};
  return {valor:dados.potencia*dados.quantidade*dados.horas*dados.dias/1000,unidade:'kWh',formula:`${dados.potencia} W × ${dados.quantidade} ${tipo==='aparelhos'?'aparelhos':'lâmpadas'} × ${dados.horas} h/dia × ${dados.dias} dias ÷ 1.000`,tipo};
}
function formatarEstimativa(resultado) {
  const numero=resultado.valor.toLocaleString('pt-BR',{maximumFractionDigits:6});
  if(resultado.tipo==='alimentos') return `Quantidade informada: ${numero} kg de alimentos aproveitados.`;
  if(resultado.tipo==='oleo') return `Quantidade informada: ${numero} L de óleo entregue à coleta.`;
  if(resultado.tipo==='banho') return `Cenário de referência: ${numero} L de consumo evitável nos banhos informados.`;
  return resultado.tipo==='agua'
    ? `Cenário de referência: até ${numero} L de desperdício evitável no período.`
    : `Estimativa: ${numero} kWh de consumo evitável no período.`;
}
if(typeof module!=='undefined')module.exports={modelosEstimativa,numeroEstimativa,calcularEstimativa,formatarEstimativa};
