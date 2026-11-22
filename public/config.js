// Configuração pública: edite public/config.js; o build copia para dist/config.js.
// Use somente a chave publishable (ou anon legada). NUNCA use service_role/secret.
// A segurança depende do schema.sql aplicado com RLS no projeto correspondente.
const ECOA_CONFIG = Object.freeze({
 SUPABASE_URL: 'https://nxacxbowkfstyovzgqye.supabase.co',
 SUPABASE_ANON_KEY: 'sb_publishable_aKrBKB8uOg9KoQ-rHDA9VA_4ym3MPKd'
});
if(typeof module!=='undefined')module.exports=ECOA_CONFIG;else window.EcoaConfig=ECOA_CONFIG;
