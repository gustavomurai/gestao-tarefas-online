// src/app/services/task.service.ts
// Serviço responsável por operações relacionadas a tarefas:
// listar, buscar por id, criar, atualizar e excluir.
// Faz normalização dos campos recebidos do backend (ex.: createdAt -> dataCriacao).

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Task } from '../models/task.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class TaskService {

  /*
    Endereço base do backend.
    - Em produção no Vercel (com API serverless em /api) usar rotas relativas evita CORS e aponta para
      https://<seu-projeto>.vercel.app/api/tasks automaticamente.
  */
  private apiUrl = '/api/tasks';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // Gera cabeçalhos com token do usuário logado.
  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  // --- Helpers de normalização ---
  // Alguns endpoints do backend podem enviar createdAt ao invés de dataCriacao.
  // Aqui fazemos a conversão para garantir que o frontend sempre tenha dataCriacao.
  private normalizeTaskObj(raw: any): Task {
    if (!raw) {
      // retorna um objeto mínimo para evitar erros no template
      return {
        id: 0,
        titulo: '',
        descricao: '',
        dataCriacao: '',
        dataLimite: '',
        status: 'Pendente',
        prioridade: 'Média',
        responsavel: ''
      } as Task;
    }

    // copia superficial para não modificar o objeto original
    const t: any = { ...raw };

    // se backend forneceu createdAt, convert to dataCriacao
    if ((!t.dataCriacao || t.dataCriacao === '') && t.createdAt) {
      t.dataCriacao = t.createdAt;
    }

    // se vier no formato ISO completo e você quiser apenas YYYY-MM-DD,
    // você pode normalizar aqui. Por enquanto deixamos a string como veio,
    // pois o componente de detalhes formata a exibição.
    if (!t.dataCriacao) t.dataCriacao = '';

    // garantir que campos obrigatórios existam
    t.titulo = t.titulo || '';
    t.descricao = t.descricao || '';
    t.dataLimite = t.dataLimite || '';
    t.status = t.status || 'Pendente';
    t.prioridade = t.prioridade || 'Média';
    t.responsavel = t.responsavel || '';

    return t as Task;
  }

  // --- Chamadas HTTP ---

  // Lista todas as tarefas, normalizando cada objeto de task.
  getTasks(): Observable<Task[]> {
    return this.http.get<any[]>(this.apiUrl, { headers: this.getHeaders() }).pipe(
      map((arr: any[]) => {
        if (!Array.isArray(arr)) return [];
        return arr.map(item => this.normalizeTaskObj(item));
      })
    );
  }

  // Busca uma tarefa por id (ajusta a URL e normaliza o objeto retornado).
  getTaskById(id: number | string): Observable<Task> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(raw => this.normalizeTaskObj(raw))
    );
  }

  // Cria uma nova tarefa. Normaliza a resposta do backend antes de devolver.
  addTask(task: Omit<Task, 'id' | 'dataCriacao'>): Observable<Task> {
    return this.http.post<any>(this.apiUrl, task, { headers: this.getHeaders() }).pipe(
      map(resp => {
        // alguns backends retornam { ok: true, task: {...} }
        // ou simplesmente a task criada. Tentamos extrair a task.
        const created = resp && resp.task ? resp.task : resp;
        return this.normalizeTaskObj(created);
      })
    );
  }

  // Atualiza uma tarefa existente. Normaliza a resposta (se houver).
  updateTask(task: Task): Observable<Task> {
    const url = `${this.apiUrl}/${task.id}`;
    return this.http.put<any>(url, task, { headers: this.getHeaders() }).pipe(
      map(resp => {
        const updated = resp && resp.task ? resp.task : resp;
        return this.normalizeTaskObj(updated);
      }),
      tap((updated) => {
        // aqui você pode adicionar lógica para atualizar cache local, emitir eventos etc.
        // mantive vazio por enquanto para não alterar comportamento.
      })
    );
  }

  // Exclui uma tarefa pelo id.
  deleteTask(id: number | string): Observable<void> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.delete<void>(url, { headers: this.getHeaders() });
  }
}
