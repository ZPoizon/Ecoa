// Posição inicial apenas: a busca e o cadastro não ficam limitados a esta cidade.
// Referência: https://geoftp.ibge.gov.br/cartas_e_mapas/mapas_municipais/colecao_de_mapas_municipais/2020/SP/capao_bonito/3510203_MM.pdf
const ECOA_MAPA_INICIAL = Object.freeze({centro:Object.freeze([-24.01,-48.35]),zoom:14,categoria:''});
if(typeof module!=='undefined')module.exports=ECOA_MAPA_INICIAL;
else window.EcoaMapaInicial=ECOA_MAPA_INICIAL;
