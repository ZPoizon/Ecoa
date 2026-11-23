// Mapa público: não acessa nem modifica os lugares privados já salvos.
function iniciarMapaPublico(doc, ambiente) {
  const $ = id => doc.getElementById(id), config = ambiente.EcoaMapaInicial;
  let mapa, carregando = false, posicao;
  const aviso = texto => { if ($('cidade-status')) $('cidade-status').textContent = texto; };

  function centralizar(p, zoom = 16) {
    if (!p || !Number.isFinite(p.latitude) || !Number.isFinite(p.longitude)) return;
    posicao = [p.latitude, p.longitude];
    if (mapa) mapa.setView(posicao, zoom, { animate: false });
    else $('cidade-carregar').click();
  }

  // Busca única: um ponto encontrado abre o cartão; endereço só move o mapa.
  doc.addEventListener('cidade-busca-selecionada', e => {
    const item = e.detail;
    if (item?.jaTratado) return;
    const p = item?.tipo === 'ponto' ? item.ponto : item?.endereco;
    if (!p || !Number.isFinite(p.latitude) || !Number.isFinite(p.longitude)) return;
    centralizar(p, item.tipo === 'ponto' ? 16 : 15);
  });

  // Compatibilidade com o campo oculto usado pelo fluxo anterior.
  $('cidade-endereco')?.addEventListener('endereco-selecionado', e => centralizar(e.detail));

  async function abrir() {
    if (mapa || carregando) return;
    carregando = true; $('cidade-carregar').disabled = true; aviso('Carregando mapa…');
    try {
      await carregarLeafletCidade(doc, ambiente);
      $('cidade-mapa').hidden = false;
      mapa = ambiente.L.map('cidade-mapa', { scrollWheelZoom: false, zoomAnimation: false, fadeAnimation: false })
        .setView(posicao || config.centro, posicao ? 16 : config.zoom);
      // Tiles externos não são baixados em massa; offline permanece a base vetorial + lista.
      if (ambiente.navigator.onLine !== false) {
        ambiente.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
        }).addTo(mapa);
      } else {
        mapa.attributionControl.addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>');
      }
      const vies = () => {
        const p = mapa.getCenter();
        $('cidade-endereco').dataset.enderecoLat = p.lat.toFixed(2);
        $('cidade-endereco').dataset.enderecoLon = p.lng.toFixed(2);
      };
      mapa.on('moveend', vies); vies();
      ambiente.ecoaPontosMapa?.conectar(mapa);
      ambiente.ecoaCadastro?.conectar(mapa);
      $('cidade-mapa-abertura').hidden = true;
      aviso('Mapa aberto. Os mesmos locais estão na lista “Ver lista”.');
    } catch {
      mapa?.remove(); mapa = null; $('cidade-mapa').hidden = true;
      $('cidade-mapa-abertura').querySelector('p').textContent = 'Os pontos estão disponíveis em “Ver lista”.';
      $('cidade-carregar').hidden = false;
      aviso('Mapa indisponível; consulte a lista de pontos.');
    } finally {
      carregando = false; $('cidade-carregar').disabled = false;
    }
  }

  $('cidade-carregar').addEventListener('click', abrir);
  doc.addEventListener('ecoa-rota', e => {
    if (e.detail.tela !== 'na-cidade') return;
    if (mapa) mapa.invalidateSize({ animate: false });
    else abrir();
  });
}
if (typeof module !== 'undefined') module.exports = { iniciarMapaPublico };
else iniciarMapaPublico(document, window);
