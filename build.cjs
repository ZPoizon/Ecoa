const fs = require("node:fs");
const path = require("node:path");

function atualizarMetadadosVercel(html, origem, pagina) {
  const base = new URL(origem).origin;
  const caminho = pagina === "sobre.html" ? "/sobre.html" : "/";
  const canonico = base + caminho;
  const imagem = base + "/icons/icon-512.png";
  return html
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${canonico}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${canonico}$2`)
    .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${imagem}$2`)
    .replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${imagem}$2`);
}

function construir() {
  const fonte = path.join(__dirname, "public");
  const saida = path.join(__dirname, "dist");
  fs.rmSync(saida, { recursive: true, force: true });
  fs.cpSync(fonte, saida, { recursive: true, filter: arquivo => {
    const partes = path.relative(fonte, arquivo).split(path.sep);
    return !partes.some(parte => parte.startsWith(".") || parte === "server");
  }});
  const host = process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (host) {
    const origem = new URL(host.includes("://") ? host : `https://${host}`);
    if (origem.protocol !== "https:" || origem.username || origem.password) throw new Error("Use uma URL HTTPS em SITE_URL.");
    for (const pagina of ["index.html", "sobre.html"]) {
      const arquivo = path.join(saida, pagina);
      fs.writeFileSync(arquivo, atualizarMetadadosVercel(fs.readFileSync(arquivo, "utf8"), origem.origin, pagina));
    }
  }
  console.log("Ecoa gerado em dist/ (arquivos estáticos; API separada em api/).");
}
if (require.main === module) construir();
module.exports = { atualizarMetadadosVercel, construir };
