// Centro aproximado da sede de Capão Bonito-SP. Altere aqui para outra cidade.
// Referência: https://geoftp.ibge.gov.br/cartas_e_mapas/mapas_municipais/colecao_de_mapas_municipais/2020/SP/capao_bonito/3510203_MM.pdf
const ECOA_MAPA_INICIAL = Object.freeze({centro:Object.freeze([-24.01,-48.35]),zoom:14,categoria:'reciclagem'});
if(typeof module!=='undefined')module.exports=ECOA_MAPA_INICIAL;
else window.EcoaMapaInicial=ECOA_MAPA_INICIAL;
