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
  return {valor:dados.potencia*dados.quantidade*dados.horas*dados.dias/1000,unidade:'kWh',formula:`${dados.potencia} W × ${dados.quantidade} lâmpadas × ${dados.horas} h/dia × ${dados.dias} dias ÷ 1.000`,tipo};
}
function formatarEstimativa(resultado) {
  const numero=resultado.valor.toLocaleString('pt-BR',{maximumFractionDigits:6});
  return resultado.tipo==='agua'
    ? `Cenário de referência: até ${numero} L de desperdício evitável no período.`
    : `Estimativa: ${numero} kWh de consumo evitável no período.`;
}
if(typeof module!=='undefined')module.exports={modelosEstimativa,numeroEstimativa,calcularEstimativa,formatarEstimativa};
