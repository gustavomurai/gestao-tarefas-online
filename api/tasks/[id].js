// api/tasks/[id].js
// Endpoint dinâmico para GET/PUT/DELETE /api/tasks/:id
// Versão com extra logging e extra formas de extrair id para facilitar debug no Vercel.

const { redis } = require('../_lib/kv');

// read raw body helper
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', err => reject(err));
  });
}

async function loadTasks() {
  try {
    const raw = await redis.get('tasks');
    if (!raw) return [];
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Erro ao carregar tasks do Redis:', err && err.stack ? err.stack : err);
    return [];
  }
}

async function saveTasks(tasks) {
  try {
    await redis.set('tasks', JSON.stringify(tasks));
    return true;
  } catch (err) {
    console.error('Erro ao salvar tasks no Redis:', err && err.stack ? err.stack : err);
    return false;
  }
}

module.exports = async (req, res) => {
  // CORS básico
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // --- Extra logging pra ajudar a debugar no Vercel
    console.log('REQUEST method=', req.method, ' url=', req.url);
    // Se houver query (algumas plataformas colocam id em req.query)
    if (req.query) console.log('REQUEST query=', req.query);

    // Tentativas de extrair id em ordem:
    // 1) req.query.id (Next/Vercel style)
    // 2) req.url último segmento (ex: /api/tasks/t-1234)
    // 3) cabeçalho x-task-id (fallback)
    let id = undefined;
    if (req.query && req.query.id) id = req.query.id;
    if (!id) {
      // pegar último segmento da url
      const urlParts = (req.url || '').split('?')[0].split('/').filter(Boolean);
      if (urlParts.length) id = urlParts[urlParts.length - 1];
    }
    if (!id && req.headers && req.headers['x-task-id']) id = req.headers['x-task-id'];

    console.log('RESOLVED id=', id);

    if (!id) {
      // mostra tasks disponíveis pra debug
      const all = await loadTasks();
      console.warn('Nenhum id extraído; tasksCount=', all.length);
      return res.status(400).json({ ok: false, message: 'ID não informado na URL' });
    }

    // helpers de comparação flexível
    const matchesId = (task, idToMatch) => {
      if (task == null) return false;
      if (typeof task.id === 'number' && !isNaN(Number(idToMatch))) {
        return Number(task.id) === Number(idToMatch);
      }
      return String(task.id) === String(idToMatch);
    };

    let tasks = await loadTasks();

    // GET
    if (req.method === 'GET') {
      const found = tasks.find(t => matchesId(t, id));
      if (!found) {
        console.log('Task não encontrada para id=', id);
        return res.status(404).json({ ok: false, message: 'Task não encontrada' });
      }
      console.log('Task encontrada:', found.id);
      return res.status(200).json(found);
    }

    // PUT
    if (req.method === 'PUT') {
      const body = req.body && Object.keys(req.body).length ? req.body : JSON.parse(await getRawBody(req) || '{}');
      const idx = tasks.findIndex(t => matchesId(t, id));
      if (idx === -1) return res.status(404).json({ ok: false, message: 'Task não encontrada' });

      const updated = {
        ...tasks[idx],
        titulo: body.titulo !== undefined ? body.titulo : tasks[idx].titulo,
        descricao: body.descricao !== undefined ? body.descricao : tasks[idx].descricao,
        responsavel: body.responsavel !== undefined ? body.responsavel : tasks[idx].responsavel,
        dataLimite: body.dataLimite !== undefined ? body.dataLimite : tasks[idx].dataLimite,
        prioridade: body.prioridade !== undefined ? body.prioridade : tasks[idx].prioridade,
        status: body.status !== undefined ? body.status : tasks[idx].status,
      };

      tasks[idx] = updated;
      const ok = await saveTasks(tasks);
      if (!ok) return res.status(500).json({ ok: false, message: 'Erro ao salvar alteração' });
      console.log('Task atualizada id=', id);
      return res.status(200).json({ ok: true, task: updated });
    }

    // DELETE
    if (req.method === 'DELETE') {
      const idx = tasks.findIndex(t => matchesId(t, id));
      if (idx === -1) return res.status(404).json({ ok: false, message: 'Task não encontrada' });
      const removed = tasks.splice(idx, 1)[0];
      const ok = await saveTasks(tasks);
      if (!ok) return res.status(500).json({ ok: false, message: 'Erro ao excluir task' });
      console.log('Task removida id=', id);
      return res.status(200).json({ ok: true, removed });
    }

    return res.status(405).json({ ok: false, message: 'Método não permitido' });

  } catch (err) {
    console.error('Erro em /api/tasks/[id]:', err && err.stack ? err.stack : err);
    return res.status(500).json({ ok: false, message: 'Erro no servidor', error: String(err) });
  }
};
