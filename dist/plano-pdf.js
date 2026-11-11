async function gerarPdfPlano({ PDFDocument, StandardFonts, rgb }, itens, data) {
  const pdf = await PDFDocument.create();
  pdf.setTitle('Ecoa — Meu plano de ações');
  pdf.setAuthor('Ecoa');
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const forte = await pdf.embedFont(StandardFonts.HelveticaBold);
  const verde = rgb(.08, .25, .19);
  const tinta = rgb(.13, .20, .17);
  const suave = rgb(.89, .94, .90);
  const papel = rgb(.97, .98, .95);
  const branco = rgb(1, 1, 1);
  const margem = 42;
  const largura = 511;
  const total = itens.filter(item => item.concluida).length;
  let pagina;
  let y;

  function texto(valor, x, topo, tamanho, font = normal, color = tinta) {
    pagina.drawText(valor, { x, y: topo - tamanho, size: tamanho, font, color });
  }

  function linhas(valor, limite, tamanho, fonte) {
    const resultado = [];
    let linha = '';
    for (const palavra of valor.split(/\s+/)) {
      const candidata = linha ? linha + ' ' + palavra : palavra;
      if (linha && fonte.widthOfTextAtSize(candidata, tamanho) > limite) {
        resultado.push(linha);
        linha = palavra;
      } else linha = candidata;
    }
    if (linha) resultado.push(linha);
    return resultado;
  }

  function novaPagina() {
    pagina = pdf.addPage([595, 842]);
    const primeira = pdf.getPageCount() === 1;
    const altura = primeira ? 162 : 86;
    pagina.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: papel });
    pagina.drawRectangle({ x: 0, y: 842 - altura, width: 595, height: altura, color: verde });
    for (const raio of [4, 7.5, 11]) pagina.drawCircle({x:margem + 12, y:807, size:raio, borderWidth:.75, borderColor:suave});
    pagina.drawCircle({x:margem + 12, y:807, size:1.25, color:suave});
    texto('Ecoa', margem + 30, 818, 18, forte, branco);
    texto('Pequenas ações, 17 objetivos.', margem + 88, 812, 10, normal, suave);
    texto('Meu plano de ações', margem, 790, primeira ? 30 : 20, forte, branco);
    if (primeira) {
      texto(`Exportado em ${data}`, margem, 748, 11, normal, suave);
      texto(`${total} de ${itens.length} ações concluídas`, margem, 727, 13, forte, branco);
      pagina.drawRectangle({ x: margem, y: 693, width: largura, height: 5, color: rgb(.29, .44, .37) });
      if (total) pagina.drawRectangle({ x: margem, y: 693, width: largura * total / itens.length, height: 5, color: rgb(.71, .87, .58) });
    }
    y = 842 - altura - 22;
  }

  novaPagina();
  itens.forEach((acao, indice) => {
    const titulo = linhas(`${indice + 1}. ${acao.titulo}`, largura - 32, 15, forte);
    const custo = acao.custo === 0 ? 'Gratuita' : `Até ${acao.custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
    const metadados = linhas(`ODS ${acao.ods} · ${acao.tempo} min · ${custo} · ${acao.local}`, largura - 32, 11, normal);
    const passos = acao.passos.map((passo, ordem) => linhas(`${ordem + 1}. ${passo}`, largura - 32, 11, normal));
    const altura = 67 + titulo.length * 19 + metadados.length * 15
      + passos.reduce((soma, passo) => soma + passo.length * 15 + 4, 0);
    if (y - altura < 52) novaPagina();
    pagina.drawRectangle({ x: margem, y: y - altura, width: largura, height: altura, color: branco, borderColor: suave, borderWidth: 1 });
    const x = margem + 16;
    const etiqueta = acao.concluida ? 'CONCLUÍDA' : 'PENDENTE';
    pagina.drawRectangle({ x, y: y - 32, width: 84, height: 18, color: acao.concluida ? suave : rgb(.97, .92, .80) });
    texto(etiqueta, x + 8, y - 17, 9, forte);
    let topo = y - 39;
    for (const linha of titulo) {
      texto(linha, x, topo, 15, forte);
      topo -= 19;
    }
    for (const linha of metadados) {
      texto(linha, x, topo, 11);
      topo -= 15;
    }
    topo -= 5;
    texto('Como fazer', x, topo, 11, forte);
    topo -= 17;
    for (const passo of passos) {
      for (const linha of passo) {
        texto(linha, x, topo, 11);
        topo -= 15;
      }
      topo -= 4;
    }
    y -= altura + 12;
  });

  pdf.getPages().forEach((folha, indice) => {
    pagina = folha;
    texto('Ecoa | Projeto independente e educativo, não oficial da ONU.', margem, 33, 8);
    texto(`${indice + 1} / ${pdf.getPageCount()}`, 510, 33, 9);
  });
  return pdf.save();
}
