const portal = "https://brasil.un.org/pt-br";
const termos = [
  /pobreza|vulnerab|assistencia social/, /fome|alimenta|agricult|nutri|amamenta/,
  /saude|vacina|raiva|bem-estar|amamenta/, /educa|escola|ensino|aprend/,
  /genero|mulher|menina|casamento infantil/, /saneamento|agua potavel|esgoto/,
  /energia|eletric|renovav/, /trabalho|emprego|empreend|econom/,
  /industria|inova|infraestrutur|tecnolog/, /desigual|migr|refug|inclus|indigen/,
  /cidade|urban|municip|habitacao/, /consumo|producao|recicla|residu|desperdicio/,
  /clima|emisso|carbono|aquecimento/, /oceano|marinh|pesca|vida na agua/,
  /biodivers|florest|desmat|vida terrestre/, /paz|justica|democra|direitos|desinform/,
  /parceria|cooperacao|multilateral|assembleia geral/
];

function normalizar(texto) {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function decodificarTexto(texto) {
  return texto.replace(/&(#x[\da-f]+|#\d+|amp|nbsp|quot|apos|lt|gt);/gi, (entidade, codigo) => {
    if (codigo[0] === "#") {
      const hexadecimal = codigo[1].toLowerCase() === "x";
      const numero = Number.parseInt(codigo.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      return Number.isFinite(numero) ? String.fromCodePoint(numero) : entidade;
    }
    return {
      amp: "&",
      nbsp: " ",
      quot: '"',
      apos: "'",
      lt: "<",
      gt: ">"
    }[codigo.toLowerCase()];
  });
}

function atributo(tag, nome) {
  const escapado = nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return tag.match(new RegExp(`\\b${escapado}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"))?.slice(1).find(Boolean);
}

function extrairCartoes(html, tipo) {
  const itens = [];
  const pilha = [];
  const voids = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  const blocos = new Set(["address", "article", "blockquote", "div", "h1", "h2", "h3", "h4", "h5", "h6", "li", "p", "section"]);
  const tokens = /<!--[\s\S]*?-->|<![^>]*>|<\/?[^>]+>|[^<]+/g;
  let token;

  function fechar(frame) {
    if (frame.cartao && blocos.has(frame.nome)) frame.cartao.texto += " ";
    if (!frame.cartaoRaiz) return;
    const texto = frame.cartao.texto.trim().replace(/\s+/g, " ");
    const historia = /^História\b/u.test(texto);
    const iniciativa = /^(Faça a sua parte|Campaign)\b/u.test(texto);
    if (frame.cartao.url && frame.cartao.titulo.trim() && (tipo === "historias" ? historia : iniciativa)) {
      const data = texto.match(/\b\d{1,2} [\p{L}]+ \d{4}\b/u)?.[0];
      itens.push({ url: frame.cartao.url, titulo: frame.cartao.titulo.trim().replace(/\s+/g, " "), texto, data });
    }
  }

  while ((token = tokens.exec(html)) !== null) {
    token = token[0];
    if (token.startsWith("<!--") || token.startsWith("<!")) continue;
    if (token[0] !== "<") {
      const frame = pilha[pilha.length - 1];
      if (frame?.cartao && !frame.textoBruto) {
        const texto = decodificarTexto(token);
        frame.cartao.texto += texto;
        if (frame.tituloAtivo) frame.cartao.titulo += texto;
      }
      continue;
    }

    const fechamento = token.match(/^<\/\s*([\w:-]+)/);
    if (fechamento) {
      const nome = fechamento[1].toLowerCase();
      let indice = pilha.length - 1;
      while (indice >= 0 && pilha[indice].nome !== nome) indice--;
      if (indice < 0) continue;
      for (let atual = pilha.length - 1; atual >= indice; atual--) fechar(pilha.pop());
      continue;
    }

    const abertura = token.match(/^<\s*([\w:-]+)/);
    if (!abertura) continue;
    const nome = abertura[1].toLowerCase();
    const classes = (atributo(token, "class") || "").split(/\s+/);
    const anterior = pilha[pilha.length - 1];
    const frame = {
      nome,
      cartao: anterior?.cartao || null,
      linkAtivo: anterior?.linkAtivo || false,
      tituloAtivo: anterior?.tituloAtivo || false,
      textoBruto: nome === "script" || nome === "style",
      cartaoRaiz: false
    };

    if (nome === "div" && classes.includes("shadow-un")) {
      frame.cartao = { titulo: "", texto: "", url: "" };
      frame.linkAtivo = false;
      frame.tituloAtivo = false;
      frame.cartaoRaiz = true;
    }
    if (frame.cartao && !frame.cartaoRaiz && blocos.has(nome)) frame.cartao.texto += " ";
    if (frame.cartao && nome === "a" && classes.includes("text-lg")) {
      frame.linkAtivo = true;
      const href = atributo(token, "href");
      if (href) {
        try {
          const url = new URL(href, portal);
          if (url.protocol === "https:" && !url.username && !url.password) frame.cartao.url = url.href;
        } catch {
          frame.cartao.url = "";
        }
      }
    }
    if (frame.cartao && frame.linkAtivo && nome === "div" && classes.includes("font-bold")) {
      frame.tituloAtivo = true;
    }

    if (!voids.has(nome) && !/\/\s*>$/.test(token)) pilha.push(frame);
  }
  while (pilha.length) fechar(pilha.pop());
  return itens;
}

async function consultar(caminho, tipo) {
  try {
    const resposta = await fetch(portal + caminho, {
      headers: { "User-Agent": "Ecoa/1.0" },
      signal: AbortSignal.timeout(6500)
    });
    if (!resposta.ok) return null;
    const html = await resposta.text();
    const itens = extrairCartoes(html, tipo);
    return itens.length ? itens : null;
  } catch {
    return null;
  }
}

function resumir(itens) {
  const vistos = new Set();
  return itens.filter((item) => {
    if (vistos.has(item.url)) return false;
    vistos.add(item.url);
    return true;
  }).slice(0, 5).map(({ titulo, url, data }) => ({ titulo, url, data }));
}

module.exports = async function handler(requisicao, resposta) {
  if (requisicao.method && requisicao.method !== "GET") {
    resposta.status(405).end();
    return;
  }
  const odsTexto = requisicao.query?.ods || "";
  const ods = [...new Set(String(odsTexto).split(",")
    .filter((valor) => /^(?:[1-9]|1[0-7])$/.test(valor)).map(Number))];
  const caminhos = ods.length ? ods.map((id) => "/sdgs/" + id) : ["/stories"];
  const [iniciativas, ...historias] = await Promise.all([
    consultar("/take-action", "iniciativas"),
    ...caminhos.map((caminho) => consultar(caminho, "historias"))
  ]);
  resposta.setHeader("Cache-Control", "public, s-maxage=120, stale-while-revalidate=300");
  resposta.setHeader("X-Content-Type-Options", "nosniff");
  resposta.status(200).json({
    iniciativas: iniciativas && resumir(iniciativas.filter((item) =>
      !ods.length || ods.some((id) => termos[id - 1].test(normalizar(item.texto))))),
    historias: historias.every((itens) => itens === null)
      ? null
      : resumir(historias.flatMap((itens) => itens || []))
  });
};

module.exports.extrairCartoes = extrairCartoes;
