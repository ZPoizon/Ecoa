const { execFileSync } = require("node:child_process");
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

if (require.main === module) {
  execFileSync(process.execPath, ["validar.cjs"], { stdio: "inherit" });

  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (host) {
    const origem = new URL(host.includes("://") ? host : `https://${host}`).origin;
    for (const pagina of ["index.html", "sobre.html"]) {
      const arquivo = path.join(__dirname, "dist", pagina);
      const html = fs.readFileSync(arquivo, "utf8");
      fs.writeFileSync(arquivo, atualizarMetadadosVercel(html, origem, pagina));
    }
    console.log(`Metadados de publicação atualizados para ${origem}`);
  }
}

module.exports = { atualizarMetadadosVercel };
