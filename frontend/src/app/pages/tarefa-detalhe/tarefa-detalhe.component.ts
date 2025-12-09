/* tarefa-detalhe.component.ts
   Versão final compatível com o HTML enviado.
   Aceita ids string ("t-...") e trata loading / erros corretamente.
*/

import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TaskService } from '../../services/task.service';
import { Task } from '../../models/task.model';

@Component({
  selector: 'app-tarefa-detalhe',
  templateUrl: './tarefa-detalhe.component.html',
  styleUrls: ['./tarefa-detalhe.component.css']
})
export class TarefaDetalheComponent implements OnInit, OnDestroy {

  tarefa: Task | null = null;
  loading = true;
  errorMsg: string | null = null;

  private subs: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public taskService: TaskService
  ) {}

  ngOnInit(): void {
    // escuta mudanças de rota (para funcionar mesmo se navegar internamente)
    const sub = this.route.paramMap.subscribe((params: ParamMap) => {
      this.loading = true;
      this.errorMsg = null;
      this.tarefa = null;

      let id = this.extractId(params);

      if (!id) {
        // tenta query param ?id=...
        id = this.route.snapshot.queryParamMap.get('id');
      }

      if (!id) {
        // fallback pela hash / última parte da URL
        id = this.extractIdFromHashOrPath();
      }

      if (!id) {
        this.loading = false;
        this.errorMsg = 'ID da tarefa não encontrado na rota.';
        return;
      }

      // chama o service — aceita tanto retorno direto da task quanto { ok:true, task: {...} }
      const svcAny = this.taskService as any;
      if (!svcAny || typeof svcAny.getTaskById !== 'function') {
        console.warn('TaskService.getTaskById indisponível. Verifique o service.');
        this.loading = false;
        this.errorMsg = 'Serviço de tarefas indisponível.';
        return;
      }

      const s = svcAny.getTaskById(id).pipe(
        catchError((err: any) => {
          console.error('Erro ao buscar tarefa (catchError):', err);
          return of({ __error: true, err });
        })
      ).subscribe((res: any) => {
        this.loading = false;

        if (!res) {
          this.errorMsg = 'Tarefa não encontrada (resposta vazia).';
          return;
        }

        if (res.__error) {
          this.errorMsg = 'Erro ao carregar detalhes. Veja console.';
          return;
        }

        // caso o endpoint retorne { ok: true, task: {...} }
        if (res.ok && res.task) {
          this.tarefa = this.normalizeTaskDates(res.task);
          return;
        }

        // se o endpoint retornar já o objeto Task diretamente
        this.tarefa = this.normalizeTaskDates(res as Task);
      });

      this.subs.push(s);
    });

    this.subs.push(sub);
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.subs = [];
  }

  // ----------------- Helpers -----------------

  // extrai id do ParamMap sem converter para Number (suporta 't-123' e números)
  private extractId(params: ParamMap): string | null {
    const idParam = params.get('id');
    if (idParam) return idParam;
    return null;
  }

  // tenta tirar id do hash ou última parte do path (fallback)
  private extractIdFromHashOrPath(): string | null {
    try {
      const raw = window.location.hash || window.location.pathname || '';
      const parts = raw.split('/').filter(Boolean);
      if (parts.length === 0) return null;
      return parts[parts.length - 1];
    } catch (e) {
      return null;
    }
  }

  // Normaliza strings de data YYYY-MM-DD para ISO (evita Date inválida no browser)
  private normalizeTaskDates(t: Task): Task {
    if (!t) return t;
    const clone: any = { ...t };

    if (typeof clone.dataCriacao === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(clone.dataCriacao)) {
      clone.dataCriacao = new Date(clone.dataCriacao).toISOString();
    }

    if (typeof clone.dataLimite === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(clone.dataLimite)) {
      clone.dataLimite = new Date(clone.dataLimite).toISOString();
    }

    if (clone.descricao === null || clone.descricao === undefined) clone.descricao = '';

    return clone as Task;
  }

  // formata data para dd/mm/yyyy
  formatDate(value?: string | Date | null): string | null {
    if (!value) return null;
    const d = (value instanceof Date) ? value : new Date(value);
    if (isNaN(d.getTime())) return null;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  // ações do template
  editTarefa(): void {
    if (!this.tarefa) return;
    this.router.navigate(['/tasks/edit', this.tarefa.id]);
  }

  backToList(): void {
    this.router.navigate(['/tasks']);
  }

  confirmDelete(): void {
    if (!this.tarefa) return;
    if (!confirm('Deseja realmente excluir esta tarefa?')) return;

    const svcAny = this.taskService as any;
    if (svcAny && typeof svcAny.deleteTask === 'function') {
      const s = svcAny.deleteTask(this.tarefa.id).subscribe({
        next: () => this.router.navigate(['/tasks']),
        error: (err: any) => {
          console.error('Erro ao excluir tarefa:', err);
          alert('Erro ao excluir tarefa. Veja console para detalhes.');
        }
      });
      this.subs.push(s);
    } else {
      // fallback
      this.router.navigate(['/tasks']);
    }
  }
}
