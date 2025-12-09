// api/login/index.js
// Endpoint para autenticar usuário usando Upstash Redis.
//
// Fluxo:
// 1) recebe username + password via POST
// 2) busca user:<username> no Redis
// 3) compara password com bcrypt.compare usando passwordHash salvo
// 4) em sucesso retorna ok:true, user (sem hash) e token simples para demo

const bcrypt = require('bcryptjs');
const { redis } = require('../_lib/kv');

// Função para ler raw body (caso necessário)
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', err => reject(err));
  });
}

module.exports = async (req, res) => {
  // CORS mínimo para permitir chamadas do frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Método não permitido' });
  }

  try {
    // suporta body já parseado ou raw JSON
    const body =
      req.body && Object.keys(req.body).length
        ? req.body
        : JSON.parse(await getRawBody(req));

    const username = (body.username || body.user || '').toString().trim();
    const password = (body.password || body.senha || '').toString();

    if (!username || !password) {
      return res.status(400).json({ ok: false, message: 'username e password obrigatórios' });
    }

    const key = `user:${username.toLowerCase()}`;
    const raw = await redis.get(key);

    if (!raw) {
      // usuário não encontrado
      return res.status(401).json({ ok: false, message: 'Credenciais inválidas' });
    }

    // raw pode ser string (JSON) ou objeto
    const user = typeof raw === 'string' ? JSON.parse(raw) : raw;

    // compara senha
    const match = await bcrypt.compare(password, user.passwordHash || '');
    if (!match) {
      return res.status(401).json({ ok: false, message: 'Credenciais inválidas' });
    }

    // prepara retorno sem a hash
    const { passwordHash, ...publicUser } = user;

    // token simples para apresentação (se quiser JWT eu implemento depois)
    const token = `demo-token-${Date.now()}`;

    return res.status(200).json({ ok: true, user: publicUser, token });

  } catch (err) {
    console.error('Erro em /api/login:', err && err.stack ? err.stack : err);
    return res.status(500).json({ ok: false, message: 'Erro ao autenticar usuário', error: String(err) });
  }
};
