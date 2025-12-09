// Importação dos módulos necessários para o backend funcionar.
// express -> framework para criar servidor HTTP.
// cors -> lib para permitir requisições cross-origin (frontend <> backend).
// fs.promises -> operações de arquivo assíncronas (leitura/escrita).
// path -> manipulação de caminhos de arquivo/diretório.
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

// Cria a aplicação express e define a porta fixa para execução local.
const app = express();
const PORT = 3000;

// Configuração do CORS para permitir que o frontend acesse o backend.
// Em ambiente de produção, substitua por um domínio específico se necessário.
app.use(cors({ origin: true }));

// Permite que o servidor receba e interprete JSON no corpo das requisições.
app.use(express.json());

// Define os caminhos dos diretórios onde os JSON (simulando banco de dados) ficam armazenados.
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');

// Função para ler qualquer arquivo JSON e retornar array de dados.
// Se o arquivo não existir ou estiver inválido, retorna array vazio para evitar quebra.
async function readData(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    // Se ocorrer erro (arquivo não existe, por exemplo), retorna array vazio.
    return [];
  }
}

// Escrita "atômica": primeiro escreve em um arquivo temporário e depois renomeia.
// Isso reduz risco de deixar o arquivo corrompido se o processo falhar no meio da escrita.
async function writeDataAtomic(filePath, data) {
  const tmp = filePath + '.tmp';
  const str = JSON.stringify(data, null, 2);
  await fs.writeFile(tmp, str, 'utf8');
  await fs.rename(tmp, filePath);
}

// Gera automaticamente um novo ID baseado no maior existente no arquivo.
function nextId(items) {
  return items.length ? Math.max(...items.map(i => i.id || 0)) + 1 : 1;
}

// Normaliza valores de prioridade para 'Alta', 'Média' ou 'Baixa'.
// Aceita entradas como 'alta', 'A', 'média', 'b' etc.
function normalizePriorityValue(pri) {
  if (!pri) return pri;
  const v = String(pri).toLowerCase();
  if (v.startsWith('a')) return 'Alta';
  if (v.startsWith('m')) return 'Média';
  if (v.startsWith('b')) return 'Baixa';
  return pri;
}

// Peso usado para ordenar prioridades numericamente ao ordenar listas de tarefas.
const PRIORITY_WEIGHT = { 'Alta': 3, 'Média': 2, 'Baixa': 1 };

// Token fixo usado APENAS para simular autenticação em ambiente de desenvolvimento.
// NÃO usar token fixo em produção; ideal é usar um método real de autenticação.
const AUTH_TOKEN = 'fake-token-auth';

// Middleware que valida o token presente no header Authorization: Bearer <token>
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token ausente.' });
  if (token !== AUTH_TOKEN) return res.status(403).json({ message: 'Token inválido.' });
  next();
}

/* ROTA RAIZ: verifica se o servidor está respondendo */
app.get('/', (req, res) => {
  return res.status(200).send('ok');
});

/* AUTENTICAÇÃO SIMULADA: register / login */

// Rota de registro de usuário — grava usuário no arquivo users.json.
app.post('/register', async (req, res) => {
  const { username, password, nomeCompleto, email, telefone } = req.body || {};

  // Validação básica de campos obrigatórios.
  if (!username || !password) return res.status(400).json({ message: 'username e password são obrigatórios.' });

  const users = await readData(USERS_FILE);

  // Evita usernames duplicados.
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ message: 'Nome de usuário já existe.' });
  }

  // Cria novo usuário no JSON (senha não é criptografada — apenas para fins didáticos).
  const newUser = {
    id: nextId(users),
    username,
    password,
    nomeCompleto: nomeCompleto || '',
    email: email || '',
    telefone: telefone || ''
  };

  users.push(newUser);
  await writeDataAtomic(USERS_FILE, users);
  return res.status(201).json({ message: 'Usuário cadastrado. Faça login.' });
});

// Login verifica credenciais e retorna token de acesso.
app.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) return res.status(400).json({ message: 'username e password são obrigatórios.' });

  const users = await readData(USERS_FILE);
  const user = users.find(u => u.username === username && u.password === password);

  if (!user) return res.status(401).json({ message: 'Credenciais inválidas.' });

  // Remove a senha ao enviar dados ao frontend.
  const userSafe = { id: user.id, username: user.username, nomeCompleto: user.nomeCompleto || '', email: user.email || '', telefone: user.telefone || '' };

  return res.json({ token: AUTH_TOKEN, user: userSafe });
});

/* ROTAS PARA USUÁRIOS */

// Atualiza um usuário existente baseado no ID da URL.
// Esta rota exige autenticação (middleware authenticateToken).
app.put('/users/:id', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const payload = req.body || {};
    const users = await readData(USERS_FILE);

    const idx = users.findIndex(u => Number(u.id) === id);
    if (idx === -1) return res.status(404).json({ message: 'Usuário não encontrado.' });

    // Atualiza apenas campos permitidos.
    const allowed = ['username', 'nomeCompleto', 'email', 'telefone', 'password'];
    for (const key of Object.keys(payload)) {
      if (allowed.includes(key)) {
        users[idx][key] = payload[key];
      }
    }

    await writeDataAtomic(USERS_FILE, users);

    const updated = users[idx];
    const userSafe = { id: updated.id, username: updated.username, nomeCompleto: updated.nomeCompleto || '', email: updated.email || '', telefone: updated.telefone || '' };

    return res.json({ message: 'Usuário atualizado.', user: userSafe });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro ao atualizar usuário.' });
  }
});

/* CRUD DE TAREFAS (rotas protegidas) */

// Retorna todas as tarefas, com suporte a filtros e ordenação.
app.get('/tasks', authenticateToken, async (req, res) => {
  try {
    let tasks = await readData(TASKS_FILE);
    const { q, status, responsavel, sort, order } = req.query;

    // Filtro de busca por texto.
    if (q) {
      const ql = String(q).toLowerCase();
      tasks = tasks.filter(t =>
        (t.titulo || '').toLowerCase().includes(ql) ||
        (t.descricao || '').toLowerCase().includes(ql)
      );
    }

    // Filtro por status.
    if (status) {
      tasks = tasks.filter(t => String(t.status || '').toLowerCase() === String(status).toLowerCase());
    }

    // Filtro por responsável.
    if (responsavel) {
      tasks = tasks.filter(t =>
        String(t.responsavel || '').toLowerCase().includes(String(responsavel).toLowerCase())
      );
    }

    // Ordenação personalizada.
    if (sort) {
      const dir = (order && String(order).toLowerCase() === 'desc') ? -1 : 1;

      if (sort === 'prioridade') {
        tasks.sort((a, b) => {
          const wa = PRIORITY_WEIGHT[normalizePriorityValue(a.prioridade)] || 0;
          const wb = PRIORITY_WEIGHT[normalizePriorityValue(b.prioridade)] || 0;
          return (wa - wb) * dir;
        });

      } else if (sort === 'dataLimite' || sort === 'dataCriacao') {
        tasks.sort((a, b) => {
          const da = a[sort] ? new Date(a[sort]) : new Date(0);
          const db = b[sort] ? new Date(b[sort]) : new Date(0);
          return (da - db) * dir;
        });

      } else {
        // Ordenação padrão por texto.
        tasks.sort((a, b) => {
          const ra = String(a[sort] || '').toLowerCase();
          const rb = String(b[sort] || '').toLowerCase();
          if (ra < rb) return -1 * dir;
          if (ra > rb) return 1 * dir;
          return 0;
        });
      }
    }

    res.json(tasks);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao ler tarefas.' });
  }
});

// Retorna uma única tarefa baseada no ID.
app.get('/tasks/:id', authenticateToken, async (req, res) => {
  const id = Number(req.params.id);
  const tasks = await readData(TASKS_FILE);
  const t = tasks.find(x => Number(x.id) === id);
  if (!t) return res.status(404).json({ message: 'Tarefa não encontrada.' });
  return res.json(t);
});

// Cria uma nova tarefa e salva no arquivo JSON.
app.post('/tasks', authenticateToken, async (req, res) => {
  try {
    const payload = req.body || {};

    if (!payload.titulo || !payload.prioridade) {
      return res.status(400).json({ message: 'titulo e prioridade obrigatórios.' });
    }

    const tasks = await readData(TASKS_FILE);
    const id = nextId(tasks);

    const nova = {
      id,
      titulo: payload.titulo,
      descricao: payload.descricao || '',
      responsavel: payload.responsavel || 'Desconhecido',
      prioridade: normalizePriorityValue(payload.prioridade),
      status: payload.status || 'Pendente',
      dataLimite: payload.dataLimite || null,
      dataCriacao: payload.dataCriacao || new Date().toISOString().split('T')[0]
    };

    tasks.push(nova);
    await writeDataAtomic(TASKS_FILE, tasks);
    return res.status(201).json(nova);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro ao criar tarefa.' });
  }
});

// Atualiza uma tarefa já existente.
app.put('/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const payload = req.body || {};
    let tasks = await readData(TASKS_FILE);

    const idx = tasks.findIndex(t => Number(t.id) === id);
    if (idx === -1) return res.status(404).json({ message: 'Tarefa não encontrada.' });

    const updated = {
      ...tasks[idx],
      ...payload,
      id // garante que o ID nunca seja alterado.
    };

    if (payload.prioridade) {
      updated.prioridade = normalizePriorityValue(payload.prioridade);
    }

    tasks[idx] = updated;
    await writeDataAtomic(TASKS_FILE, tasks);
    return res.json(updated);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro ao atualizar tarefa.' });
  }
});

// Exclui uma tarefa do arquivo JSON.
app.delete('/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    let tasks = await readData(TASKS_FILE);

    const newTasks = tasks.filter(t => Number(t.id) !== id);

    if (newTasks.length === tasks.length) {
      return res.status(404).json({ message: 'Tarefa não encontrada.' });
    }

    await writeDataAtomic(TASKS_FILE, newTasks);
    return res.status(204).send();

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro ao deletar tarefa.' });
  }
});

/* Inicializa o servidor na porta 3000 para uso local */
app.listen(PORT, () => {
  console.log(`Backend rodando na porta ${PORT}`);
  console.log('Usuário demo: admin / 123');
});
