// api/tasks/index.js
// GET  /api/tasks  -> retorna array de tarefas
// POST /api/tasks  -> cria tarefa com ID sequencial (1,2,3,...)
// Usa Upstash Redis via ../_lib/kv.js
// Comentários em Português para facilitar entendimento.

/* eslint-disable no-console */
const { redis } = require('../_lib/kv');

// Lê corpo raw caso req.body não esteja parseado
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', err => reject(err));
  });
}

// Carrega tasks do Redis (retorna sempre um array)
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

// Salva o array de tasks no Redis (substitui completamente a chave)
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
  // CORS mínimo para frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const tasks = await loadTasks();
      return res.status(200).json(tasks);
    }

    if (req.method === 'POST') {
      // aceita body parseado ou raw JSON
      const body = req.body && Object.keys(req.body).length
        ? req.body
        : JSON.parse(await getRawBody(req));

      // validação mínima
      const titulo = (body.titulo || body.title || body.nome || '').toString().trim();
      if (!titulo) {
        return res.status(400).json({ ok: false, message: 'Título da tarefa é obrigatório' });
      }

      // carrega tasks atuais
      const tasks = await loadTasks();

      // chave do contador sequencial
      const counterKey = 'tasks:counter';

      // --- Política solicitada: zera e começa do 1 ---
      // 1) Se variável de ambiente FORCE_RESET_COUNTER == '1', forçamos o contador para 0.
      //    Use isso se quiser resetar manualmente (ex.: em dev ou apresentação).
      // 2) Se a chave não existir, inicializamos com '0' (assim INCR retorna 1).
      // 3) Caso a chave já exista com valor >0 e você NÃO tiver forçado o reset,
      //    o contador continuará a partir do valor existente (evita perda de histórico).
      //
      // Atenção: se já houver tasks com IDs altos salvos, você pode ter IDs duplicados
      // após forçar o reset — veja seção de migração abaixo.
      if (process.env.FORCE_RESET_COUNTER === '1') {
        try {
          await redis.set(counterKey, '0');
          console.log('FORCE_RESET_COUNTER ativo: tasks:counter setado para 0');
        } catch (e) {
          console.warn('Falha ao setar tasks:counter para 0 (FORCE_RESET_COUNTER):', e);
        }
      } else {
        // se não existir, garantimos que começa em 0 (então INCR -> 1)
        const existing = await redis.get(counterKey);
        if (!existing) {
          try {
            await redis.set(counterKey, '0');
            // não logar demais em produção
            console.log('Inicializando tasks:counter = 0 (chave inexistente)');
          } catch (e) {
            console.warn('Não foi possível inicializar tasks:counter:', e);
          }
        }
      }

      // INCR atômico para gerar novo id sequencial (primeiro INCR -> 1)
      const newIdNum = await redis.incr(counterKey);

      const newTask = {
        id: newIdNum, // id numérico sequencial (1,2,3,...)
        titulo,
        descricao: body.descricao || body.description || '',
        responsavel: body.responsavel || body.responsible || '',
        dataLimite: body.dataLimite || body.dueDate || null,
        prioridade: body.prioridade || body.priority || 'Média',
        status: body.status || 'Aberta',
        dataCriacao: new Date().toISOString()
      };

      // adiciona no começo para aparecer primeiro na listagem
      tasks.unshift(newTask);

      // salva no Redis
      const ok = await saveTasks(tasks);
      if (!ok) {
        return res.status(500).json({ ok: false, message: 'Erro ao persistir tarefa' });
      }

      return res.status(201).json({ ok: true, task: newTask });
    }

    return res.status(405).json({ ok: false, message: 'Método não permitido' });
  } catch (err) {
    console.error('Erro em /api/tasks:', err && err.stack ? err.stack : err);
    return res.status(500).json({ ok: false, message: 'Erro no servidor', error: String(err) });
  }
};
