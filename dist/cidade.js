// Pontos declarados pelo usuário; nenhum cadastro é uma certificação do Ecoa.
const categoriasCidade = {coleta:'Coleta seletiva',horta:'Horta comunitária',doacao:'Doações'};
const chaveCidade = 'ecoa-pontos-v1';
function validarPontosCidade(dados) {
  if(!dados || dados.versao!==1 || !Array.isArray(dados.pontos) || dados.pontos.length>200) throw Error('Escolha uma cópia de pontos salva pelo Ecoa, com até 200 locais.');
  const ids=new Set();
  return dados.pontos.map((p,i)=>{
    const erro=mensagem=>{throw Error(`Ponto ${i+1}: ${mensagem}`);};
    if(!p || typeof p!=='object')erro('cadastro inválido.');
    const texto=(campo,max)=>{
      if(typeof p[campo]!=='string'||!p[campo].trim()||p[campo].length>max)erro(`preencha ${campo} (até ${max} caracteres).`);
      return p[campo].trim();
    };
    const id=texto('id',80);
    if(ids.has(id))erro('identificador repetido.');ids.add(id);
    if(!Object.hasOwn(categoriasCidade,p.categoria))erro('categoria deve ser coleta, horta ou doacao.');
    for(const [campo,max] of [['latitude',90],['longitude',180]])if(typeof p[campo]!=='number'||!Number.isFinite(p[campo])||Math.abs(p[campo])>max)erro(`${campo} inválida.`);
    const fonte=texto('fonte',500);
    let url;try{url=new URL(fonte);}catch{erro('fonte deve ser um link HTTPS.');}
    if(url.protocol!=='https:'||url.username||url.password)erro('fonte deve ser um link HTTPS sem credenciais.');
    const data=texto('consultadoEm',10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(data)||Number.isNaN(Date.parse(data))||new Date(data).toISOString().slice(0,10)!==data||data>new Date().toISOString().slice(0,10))erro('informe uma data de consulta válida, sem estar no futuro.');
    return {id,nome:texto('nome',120),cidade:texto('cidade',100),categoria:p.categoria,endereco:texto('endereco',240),detalhes:texto('detalhes',600),latitude:p.latitude,longitude:p.longitude,fonte:url.href,consultadoEm:data};
  });
}
function lerJsonCidade(texto) {
  if(typeof texto!=='string'||new TextEncoder().encode(texto).length>500000)throw Error('O arquivo deve ter no máximo 500 KB.');
  let dados;try{dados=JSON.parse(texto.replace(/^\uFEFF/,''));}catch{throw Error('Não foi possível ler a cópia. Escolha um arquivo salvo pelo Ecoa.');}
  return validarPontosCidade(dados);
}
function unirPontosCidade(atuais,novos) {
  // Identificadores existentes são preservados, sem sobrescrever silenciosamente.
  const mapa=new Map(atuais.map(p=>[p.id,p]));novos.forEach(p=>{if(!mapa.has(p.id))mapa.set(p.id,p);});
  return validarPontosCidade({versao:1,pontos:[...mapa.values()]});
}
function filtrarPontosCidade(pontos,cidade='',categoria='') {
  const normalizar=s=>s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim();
  return pontos.filter(p=>(!categoria||p.categoria===categoria)&&normalizar(p.cidade).includes(normalizar(cidade)));
}
function salvarPontosCidade(storage,pontos) {
  const seguros=validarPontosCidade({versao:1,pontos});
  try{storage.setItem(chaveCidade,JSON.stringify({versao:1,pontos:seguros}));}catch{throw Error('Não foi possível salvar neste navegador. Libere espaço ou permita o armazenamento; seus pontos anteriores foram mantidos.');}
  return seguros;
}
if(typeof module!=='undefined')module.exports={categoriasCidade,chaveCidade,validarPontosCidade,lerJsonCidade,unirPontosCidade,filtrarPontosCidade,salvarPontosCidade};
