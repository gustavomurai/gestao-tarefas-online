// frontend/src/app/pages/task-list/task-list.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { TaskService } from '../../services/task.service';
import { Task } from '../../models/task.model';
import { AuthService } from '../../services/auth.service';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.css']
})
export class TaskListComponent implements OnInit, OnDestroy {
  // lista completa recebida do backend (fonte verdade)
  allTasks: Task[] = [];
  // lista após aplicar filtros e ordenação
  tasks: Task[] = [];
  // lista paginada que é exibida no template
  paginatedTasks: Task[] = [];
  // usado ao criar nova tarefa via UI rápida
  newTask: Partial<Task> = { prioridade: 'Média', responsavel: '' };

  // -------------------------
  // filtros (estado do componente)
  // -------------------------
  filterTitulo = '';
  filterDescricao = '';
  filterStatus = '';
  filterPrioridade = '';
  filterDataLimite = '';
  filterResponsavel = '';

  // -------------------------
  // ordenação / paginação
  // -------------------------
  sortKey: keyof Task | null = 'id';
  sortDirection: 'asc' | 'desc' = 'asc';
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;

  private routerSub?: Subscription;

  constructor(
    private taskService: TaskService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // carrega dados iniciais do serviço
    this.loadTasks();

    // esta inscrição recarrega a lista sempre que a rota muda para /tasks
    // útil quando voltamos da edição/criação para garantir dados atualizados
    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((ev: any) => {
      const url = ev?.urlAfterRedirects ?? ev?.url ?? '';
      if (url.startsWith('/tasks')) {
        this.loadTasks();
      }
    });
  }

  ngOnDestroy(): void {
    // limpa inscrição para evitar memory leak
    this.routerSub?.unsubscribe();
  }

  // ---------- welcomeMessage getter (apresentação no header) ----------
  // retorna "Olá, Nome" usando apenas o primeiro nome salvo no AuthService
  get welcomeMessage(): string {
    const stored = this.authService.getUsername(); // pode ser nome completo ou username
    if (!stored) return '';
    const firstName = stored.trim().split(' ')[0];
    return `Olá, ${firstName.charAt(0).toUpperCase() + firstName.slice(1)}`;
  }

  // logout: confirma e redireciona para /login
  onLogout(): void {
    if (confirm('Tem certeza que deseja sair da aplicação?')) {
      this.authService.logout();
      this.router.navigate(['/login']);
    }
  }

  // ---------------- Import / Export (arquivo) ----------------

  /**
   * Abre o input de arquivo (invisível no template).
   * Procure pelo elemento <input id="fileInput"> no HTML.
   */
  importarArquivo(): void {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement | null;
    if (!fileInput) {
      alert('Elemento de importação não encontrado (input#fileInput).');
      return;
    }
    // limpa valor anterior para permitir reenvio do mesmo arquivo
    fileInput.value = '';
    fileInput.click();
  }

  /**
   * Manipula o evento change do input file.
   * Suporta .json (array de tarefas) e .csv (cabecalho + linhas).
   * Normaliza cada item via normalizeImportedTask().
   */
  processarArquivo(event: any): void {
    const file: File | undefined = event?.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const text = reader.result as string;

      try {
        let importedData: Task[] = [];

        if (file.name.toLowerCase().endsWith('.json')) {
          const parsed = JSON.parse(text);
          if (!Array.isArray(parsed)) {
            alert('O arquivo JSON deve conter um array de tarefas.');
            return;
          }
          importedData = parsed.map((it: any) => this.normalizeImportedTask(it));
        } else if (file.name.toLowerCase().endsWith('.csv')) {
          const parsed = this.csvParaJson(text);
          importedData = parsed.map((it: any) => this.normalizeImportedTask(it));
        } else {
          alert('Formato inválido. Use .json ou .csv');
          return;
        }

        // validação simples
        if (!Array.isArray(importedData)) {
          alert('Arquivo inválido.');
          return;
        }

        // substitui a lista atual (se quiser mesclar, posso alterar)
        this.allTasks = importedData;
        this.applyFilters();
        alert('Lista importada com sucesso!');
      } catch (err) {
        console.error('Erro na importação:', err);
        alert('Erro ao processar o arquivo. Verifique o formato.');
      }
    };

    reader.onerror = (err) => {
      console.error('Leitura de arquivo falhou', err);
      alert('Erro ao ler o arquivo.');
    };

    reader.readAsText(file);
  }

  /**
   * Converte item genérico importado para o modelo Task utilizado internamente.
   * Faz tentativas de mapeamento tolerante a diferentes nomes de chave.
   */
  private normalizeImportedTask(item: any): Task {
    // mapeamento de chaves (tolerante a variações)
    const lowerKeys: any = {};
    for (const k of Object.keys(item || {})) {
      lowerKeys[k.toLowerCase()] = item[k];
    }

    const parseDate = (v: any) => {
      if (!v) return null;
      // se for timestamp ou string ISO
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d.toISOString();
    };

    const task: any = {
      id: Number(lowerKeys['id'] ?? lowerKeys['taskid'] ?? lowerKeys['codigo'] ?? 0),
      titulo: String(lowerKeys['titulo'] ?? lowerKeys['title'] ?? lowerKeys['name'] ?? '') || '',
      descricao: String(lowerKeys['descricao'] ?? lowerKeys['description'] ?? '') || '',
      status: String(lowerKeys['status'] ?? 'Pendente'),
      prioridade: String(lowerKeys['prioridade'] ?? lowerKeys['priority'] ?? 'Média'),
      dataLimite: parseDate(lowerKeys['datalimite'] ?? lowerKeys['deadline'] ?? lowerKeys['date'] ?? lowerKeys['data']),
      responsavel: String(lowerKeys['responsavel'] ?? lowerKeys['responsible'] ?? lowerKeys['owner'] ?? '') || '',
      dataCriacao: parseDate(lowerKeys['datacriacao'] ?? lowerKeys['created'] ?? lowerKeys['createdAt'] ?? null)
    };

    // se id não vier, tenta gerar incremental baseado no maior id atual
    if (!task.id || isNaN(task.id) || task.id === 0) {
      const maxId = this.allTasks.length ? Math.max(...this.allTasks.map(t => Number(t.id || 0))) : 0;
      task.id = maxId + 1;
    }

    return task as Task;
  }

  /**
   * Parser CSV simples: primeira linha é cabeçalho, demais são dados.
   * Não lida com cenários extremamente complexos (multilinha em aspas).
   */
  private csvParaJson(csv: string): any[] {
    const lines = csv.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 1) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1);

    return rows.map(line => {
      const cols = this.splitCsvLine(line);
      const obj: any = {};
      headers.forEach((h, i) => obj[h] = cols[i] ?? '');
      return obj;
    });
  }

  /**
   * Split de linha CSV com suporte básico a aspas ("") e escapes.
   * Projetado para nossos exports simples — não substitui um parser robusto.
   */
  private splitCsvLine(line: string): string[] {
    // se houver aspas, faz parsing básico
    if (line.indexOf('"') >= 0) {
      const result: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          // verifica escape de ""
          if (inQuotes && line[i+1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === ',' && !inQuotes) {
          result.push(cur);
          cur = '';
        } else {
          cur += ch;
        }
      }
      result.push(cur);
      return result.map(s => s.trim());
    }
    // split simples quando não há aspas
    return line.split(',').map(s => s.trim());
  }

  /**
   * Pergunta ao usuário se exporta CSV (OK) ou JSON (Cancelar).
   * Chamadas internas geram o arquivo e forçam download.
   */
  exportarLista(): void {
    if (!this.allTasks || this.allTasks.length === 0) {
      alert('Não há tarefas para exportar.');
      return;
    }

    const exportAsCsv = confirm('Deseja exportar como CSV? (OK = CSV, Cancel = JSON)');
    if (exportAsCsv) {
      this.exportCSV();
    } else {
      this.exportJSON();
    }
  }

  private exportJSON(): void {
    const jsonData = JSON.stringify(this.allTasks, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tarefas.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  private exportCSV(): void {
    // cabeçalho fixo (ordem e nomes esperados)
    const headers = ['id', 'titulo', 'descricao', 'status', 'prioridade', 'dataLimite', 'responsavel', 'dataCriacao'];
    const lines = [headers.join(',')];

    for (const t of this.allTasks) {
      const safe = (v: any) => {
        if (v === null || v === undefined) return '';
        let s = String(v);
        // se tiver vírgula ou aspas, envolver em aspas e escapar aspas internas
        if (s.indexOf(',') >= 0 || s.indexOf('"') >= 0) {
          s = '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      };

      const row = [
        safe(t.id),
        safe(t.titulo),
        safe(t.descricao),
        safe(t.status),
        safe(t.prioridade),
        safe(t.dataLimite),
        safe(t.responsavel),
        safe((t as any).dataCriacao ?? '')
      ].join(',');

      lines.push(row);
    }

    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tarefas.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---------------- Fim Import / Export ----------------

  /**
   * Faz a chamada ao service para carregar todas as tarefas.
   * Resultado é armazenado em allTasks e então applyFilters() organiza exibição.
   */
  loadTasks(): void {
    this.taskService.getTasks().subscribe({
      next: (data) => {
        this.allTasks = data || [];
        // garante que tasks/paginacao sejam atualizados
        this.applyFilters();
      },
      error: (err) => console.error('Erro ao carregar tarefas', err)
    });
  }

  /**
   * Controle de ordenação: alterna direção ao clicar no mesmo campo,
   * caso contrário define o novo campo e ordenação ascendente.
   */
  sortTasks(key: keyof Task): void {
    if (this.sortKey === key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDirection = 'asc';
    }
    this.currentPage = 1;
    this.applyFilters();
  }

  // =========================
  // applyFilters (robusto)
  // =========================
  /**
   * Aplica todos os filtros armazenados no componente sobre allTasks,
   * depois aplica ordenação e atualiza paginação.
   */
  applyFilters(): void {
    // clona o array original para não mutar a fonte de verdade
    let filteredList = [...this.allTasks];

    // filtro por título (case-insensitive)
    if (this.filterTitulo && this.filterTitulo.trim() !== '') {
      const term = this.filterTitulo.toLowerCase();
      filteredList = filteredList.filter(task =>
        (task.titulo || '').toLowerCase().includes(term)
      );
    }

    // filtro por descrição
    if (this.filterDescricao && this.filterDescricao.trim() !== '') {
      const term = this.filterDescricao.toLowerCase();
      filteredList = filteredList.filter(task =>
        (task.descricao || '').toLowerCase().includes(term)
      );
    }

    // filtro por status (igualdade)
    if (this.filterStatus && this.filterStatus.trim() !== '') {
      filteredList = filteredList.filter(task => task.status === this.filterStatus);
    }

    // filtro por prioridade (igualdade)
    if (this.filterPrioridade && this.filterPrioridade.trim() !== '') {
      filteredList = filteredList.filter(task => task.prioridade === this.filterPrioridade);
    }

    // filtro por dataLimite (normaliza para YYYY-MM-DD)
    if (this.filterDataLimite && this.filterDataLimite.trim() !== '') {
      filteredList = filteredList.filter(task => {
        if (!task.dataLimite) return false;
        const taskDate = new Date(task.dataLimite);
        if (isNaN(taskDate.getTime())) return false;
        const taskISO = taskDate.toISOString().slice(0, 10); // YYYY-MM-DD
        return taskISO === this.filterDataLimite;
      });
    }

    // filtro por responsável (contém, case-insensitive)
    if (this.filterResponsavel && this.filterResponsavel.trim() !== '') {
      const term = this.filterResponsavel.toLowerCase();
      filteredList = filteredList.filter(task =>
        (task.responsavel || '').toLowerCase().includes(term)
      );
    }

    // ordenação (se houver chave definida)
    if (this.sortKey) {
      const key = this.sortKey;
      const direction = this.sortDirection === 'asc' ? 1 : -1;

      filteredList.sort((a, b) => {
        const direction = this.sortDirection === 'asc' ? 1 : -1;

        // ===== TRATAMENTO ESPECIAL PRIORIDADE =====
        if (this.sortKey === 'prioridade') {
          const peso: any = { 'Alta': 3, 'Média': 2, 'Baixa': 1 };

          const pa = peso[a.prioridade] ?? 0;
          const pb = peso[b.prioridade] ?? 0;

          if (pa === pb) return 0;
          return (pa > pb ? 1 : -1) * direction;
        }

        // ===== TRATAMENTO ESPECIAL DATA =====
        if (this.sortKey === 'dataLimite') {
          const da = a.dataLimite ? new Date(a.dataLimite).getTime() : 0;
          const db = b.dataLimite ? new Date(b.dataLimite).getTime() : 0;

          if (da === db) return 0;
          return (da > db ? 1 : -1) * direction;
        }

        // ===== NÚMEROS =====
        const va: any = a[this.sortKey!] ?? '';
        const vb: any = b[this.sortKey!] ?? '';

        if (typeof va === 'number' && typeof vb === 'number') {
          if (va === vb) return 0;
          return (va > vb ? 1 : -1) * direction;
        }

        // ===== STRINGS =====
        const sa = String(va).toLowerCase();
        const sb = String(vb).toLowerCase();

        if (sa === sb) return 0;
        return (sa > sb ? 1 : -1) * direction;
      });

    }

    // atualiza estado visível e paginação
    this.tasks = filteredList;
    this.updatePagination();
  }

  // =========================
  // resetFilters (completo)
  // =========================
  /**
   * Limpa todos os campos de filtro, reseta ordenação para id e volta à página 1.
   */
  resetFilters(): void {
    this.filterTitulo = '';
    this.filterDescricao = '';
    this.filterStatus = '';
    this.filterPrioridade = '';
    this.filterDataLimite = '';
    this.filterResponsavel = '';

    // reset de ordenação: voltar ao padrão (id asc)
    this.sortKey = 'id';
    this.sortDirection = 'asc';

    // voltar à primeira página
    this.currentPage = 1;

    // reaplica (zera todos os filtros)
    this.applyFilters();
  }

  // =========================
  // Paginação
  // =========================
  /**
   * Calcula totalPages, ajusta currentPage se necessário e define paginatedTasks.
   */
  updatePagination(): void {
    this.totalPages = Math.ceil(this.tasks.length / this.itemsPerPage) || 1;
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages > 0 ? this.totalPages : 1;
    }

    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedTasks = this.tasks.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  get pageNumbers(): number[] {
    return Array(this.totalPages).fill(0).map((x, i) => i + 1);
  }

  // =========================
  // CRUD básicos
  // =========================
  /**
   * Adiciona tarefa usando o TaskService e atualiza listas locais.
   * A nova tarefa retornada pelo backend é empurrada para allTasks.
   */
  addTask(): void {
    const taskToAdd: Omit<Task, 'id' | 'dataCriacao'> = this.newTask as Omit<Task, 'id' | 'dataCriacao'>;

    this.taskService.addTask(taskToAdd).subscribe({
      next: (task) => {
        this.allTasks.push(task);
        this.applyFilters();
        this.newTask = { prioridade: 'Média', responsavel: '' };
      },
      error: (err) => console.error('Erro ao adicionar tarefa', err)
    });
  }

  /**
   * Exclui tarefa: confirma com o usuário, chama o service e atualiza a lista local.
   */
  deleteTask(id: number): void {
    if (confirm('Tem certeza de que deseja excluir esta tarefa?')) {
      this.taskService.deleteTask(id).subscribe({
        next: () => {
          this.allTasks = this.allTasks.filter(t => t.id !== id);
          this.applyFilters();
        },
        error: (err) => console.error('Erro ao excluir tarefa', err)
      });
    }
  }
}
