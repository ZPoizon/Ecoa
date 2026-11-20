const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const porta = Number(process.env.PORT || 4173);
const raiz = path.resolve(__dirname, "dist");
const tipos = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

http.createServer(async (requisicao, resposta) => {
  if (requisicao.method !== "GET") {
    resposta.writeHead(405).end();
    return;
  }

  const caminhoUrl = new URL(requisicao.url, `http://${requisicao.headers.host}`);
  if (caminhoUrl.pathname === "/api/onu") {
    try {
      const handler = require("./api/onu.js");
      await handler(
        { method: "GET", query: Object.fromEntries(caminhoUrl.searchParams) },
        criarRespostaApi(resposta)
      );
    } catch (erro) {
      console.error("Falha na API local da ONU:", erro);
      resposta.writeHead(500, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "api_error" }));
    }
    return;
  }

  let caminho = decodeURIComponent(caminhoUrl.pathname);
  if (caminho === "/") caminho = "/index.html";
  const arquivo = path.resolve(raiz, "." + caminho);
  if (!arquivo.startsWith(raiz + path.sep)) {
    resposta.writeHead(403).end();
    return;
  }
  fs.readFile(arquivo, (erro, dados) => {
    if (erro) {
      resposta.writeHead(404).end("Pagina nao encontrada.");
      return;
    }
    resposta.setHeader("Content-Type", `${tipos[path.extname(arquivo)] || "application/octet-stream"}; charset=utf-8`);
    resposta.end(dados);
  });
}).listen(porta, "127.0.0.1", () => {
  console.log(`Ecoa em http://127.0.0.1:${porta}`);
});

function criarRespostaApi(resposta) {
  return {
    status(codigo) { resposta.statusCode = codigo; return this; },
    setHeader(nome, valor) { resposta.setHeader(nome, valor); },
    json(dados) {
      resposta.setHeader("Content-Type", "application/json; charset=utf-8");
      resposta.end(JSON.stringify(dados));
    },
    end(conteudo) { resposta.end(conteudo); }
  };
}
