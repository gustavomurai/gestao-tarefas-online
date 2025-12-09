// api/register/index.js
// Endpoint para registrar usuários usando Upstash Redis.
// Substitui totalmente o sistema baseado em arquivo JSON.
// Cada usuário é salvo em redis na chave user:<username>
// A senha é armazenada com hash bcrypt para maior segurança.

const bcrypt = require('bcryptjs');
const { redis } = require('../_lib/kv');

// Função para ler o corpo da requisição quando o Vercel não envia parseado
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', err => reject(err));
  });
}

module.exports = async (req, res) => {
  // Liberação de CORS (básico)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Método não permitido' });
  }

  try {
    // Suporte a body parseado ou raw JSON
    const body =
      req.body && Object.keys(req.body).length
        ? req.body
        : JSON.parse(await getRawBody(req));

    const username = (body.username || '').trim();
    const password = (body.password || '').trim();

    if (!username || !password) {
      return res.status(400).json({
        ok: false,
        message: 'username e password são obrigatórios'
      });
    }

    const userKey = `user:${username.toLowerCase()}`;

    // Verifica se usuário já existe
    const existing = await redis.get(userKey);
    if (existing) {
      return res.status(409).json({
        ok: false,
        message: 'Usuário já existe'
      });
    }

    // Cria hash da senha
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Monta o objeto do usuário
    const newUser = {
      username,
      passwordHash,
      nomeCompleto: body.nomeCompleto || '',
      email: body.email || '',
      cpf: body.cpf || '',
      telefone: body.telefone || '',
      createdAt: new Date().toISOString()
    };

    // Salva no Redis como JSON string
    await redis.set(userKey, JSON.stringify(newUser));

    // Remove hash antes de retornar
    const { passwordHash: _, ...publicUser } = newUser;

    return res.status(201).json({
      ok: true,
      persisted: true,
      user: publicUser
    });

  } catch (err) {
    console.error('Erro no endpoint /api/register:', err);
    return res.status(500).json({
      ok: false,
      message: 'Erro ao salvar usuário',
      error: String(err)
    });
  }
};
