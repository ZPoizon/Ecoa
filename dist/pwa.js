if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(erro => {
    console.warn('O modo offline não pôde ser ativado.', erro);
  });
}
