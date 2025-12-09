// api/_lib/kv.js
// Cliente central para conectar no Upstash Redis.
// Usa as variáveis de ambiente criadas automaticamente quando você conectou o Upstash ao projeto Vercel.
// Comentários em Português para facilitar leitura.

const { Redis } = require('@upstash/redis');

// Tenta resolver as possíveis var names que o Upstash/Vercel gerou.
// No seu painel vi KV_REST_API_URL / KV_REST_API_TOKEN / KV_URL / REDIS_URL — usamos todas as opções em fallback.
const url = process.env.KV_REST_API_URL || process.env.KV_URL || process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

// Cria o cliente Redis (Upstash)
// Se alguma variável estiver undefined, isso será detectado no runtime (e gerará erro claro).
const redis = new Redis({
  url,
  token,
});

module.exports = {
  redis
};
