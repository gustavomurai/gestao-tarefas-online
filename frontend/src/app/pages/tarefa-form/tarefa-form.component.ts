// frontend/src/app/pages/tarefa-form/tarefa-form.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, ParamMap } from '@angular/router';
import { TaskService } from '../../services/task.service';
import { Task } from '../../models/task.model';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-tarefa-form',
  templateUrl: './tarefa-form.component.html',
  styleUrls: ['./tarefa-form.component.css']
})
export class TarefaFormComponent implements OnInit, OnDestroy {

  /*
    Objeto tarefa utilizado tanto no modo criação quanto edição.
    Partial<Task> permite trabalhar com campos opcionais.
    Os valores padrão garantem que o formulário seja inicializado corretamente.
  */
  tarefa: Partial<Task> = {
    prioridade: 'Média',
    status: 'Pendente',
    responsavel: ''
  };

  // Indica se o formulário está em modo de edição (true) ou criação (false)
  isEditMode = false;

  // Indica carregamento ao buscar dados do servidor
  loading = false;

  // Guarda a inscrição no paramMap da rota para poder limpar depois
  private routeSub?: Subscription;

  constructor(
    private taskService: TaskService,    // service usado para CRUD
    private route: ActivatedRoute,       // lê parâmetros da URL
    private router: Router               // permite navegação programática
  ) {}

  ngOnInit(): void {
    /*
      Ao iniciar, fazemos subscribe em paramMap para reagir caso a rota
      mude (ex: /tasks/edit/1 → /tasks/edit/2 sem recarregar o componente).
    */
    this.routeSub = this.route.paramMap.subscribe((params: ParamMap) => {
      const idParam = params.get('id');

      // Caso exista ID, estamos editando uma tarefa
      if (idParam) {
        this.isEditMode = true;
        const id = Number(idParam);
        this.loadTaskForEdit(id);
      } else {
        /*
          Caso não haja ID, estamos criando uma nova tarefa.
          Aqui definimos valores iniciais como prioridade, status, responsável
          e definimos dataLimite como data atual no formato YYYY-MM-DD.
        */
        this.isEditMode = false;
        this.tarefa = {
          prioridade: 'Média',
          status: 'Pendente',
          responsavel: '',
          dataLimite: new Date().toISOString().slice(0, 10)
        };
      }
    });
  }

  ngOnDestroy(): void {
    // Evita memory leak ao destruir o componente
    this.routeSub?.unsubscribe();
  }

  /*
    Carrega tarefa existente para edição.
    Busca do backend via service e preenche os campos convertendo datas para
    o formato aceito por <input type="date">.
  */
  private loadTaskForEdit(id: number): void {
    this.loading = true;

    this.taskService.getTaskById(id).subscribe({
      next: (t: Task) => {
        // Preenche objeto tarefa com todos os dados recebidos
        this.tarefa = {
          ...t,
          // Converte datas possíveis para o formato YYYY-MM-DD
          dataLimite: this.normalizeToInputDate(t.dataLimite),
          dataCriacao: t.dataCriacao
            ? this.normalizeToInputDate(t.dataCriacao)
            : t.dataCriacao
        };

        this.loading = false;
      },
      error: (err: any) => {
        /*
          Se der erro buscando a tarefa, evitamos quebrar a interface.
          Em vez disso, preenchemos com valores simulados para evitar tela vazia.
        */
        console.error('Erro ao carregar tarefa para edição (serviço).', err);
        this.fillSimulatedTask(id);
        this.loading = false;
      }
    });
  }

  /*
    Converte datas vindas do backend em diferentes formatos
    para o formato esperado por inputs de data (YYYY-MM-DD).
  */
  private normalizeToInputDate(value: any): string {
    // Se valor for vazio, devolve hoje
    if (!value) return new Date().toISOString().slice(0, 10);

    // Já está no formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return value;

    // Está no formato ISO -> '2025-11-20T00:00:00Z'
    if (typeof value === 'string' && value.includes('T'))
      return value.split('T')[0];

    // Está no formato brasileiro dd/mm/yyyy
    if (typeof value === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      const [dd, mm, yyyy] = value.split('/');
      return `${yyyy}-${mm}-${dd}`;
    }

    // Tenta converter para Date
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);

    // Se nada funcionar, retorna a data de hoje
    return new Date().toISOString().slice(0, 10);
  }

  /*
    Preenche valores simulados para evitar erros de UI em caso de falha no backend.
    Isso permite que o formulário continue funcionando mesmo sem servidor.
  */
  private fillSimulatedTask(id: number) {
    const today = new Date();

    const example = {
      id,
      titulo: `TAREFA ${id} (Em Edição)`,
      descricao: 'Insira a descrição completa.',
      responsavel: 'Sistema',
      prioridade: 'Média',
      status: 'Pendente',
      dataLimite: this.normalizeToInputDate(today.toISOString()),
      dataCriacao: this.normalizeToInputDate(today.toISOString())
    } as Task;

    this.tarefa = { ...example };
  }

  /*
    Define comportamento do formulário ao enviar:
    - Se isEditMode = true → atualiza tarefa
    - Se false → cria tarefa
  */
  onSubmit(): void {
    if (this.isEditMode) {
      this.updateTask();
    } else {
      this.createTask();
    }
  }

  /*
    Criação de nova tarefa.
    Remove espaços extras com trim() e define valores padrão quando necessário.
  */
  createTask(): void {
    const payload: Omit<Task, 'id' | 'dataCriacao'> = {
      titulo: (this.tarefa.titulo || '').trim(),
      descricao: (this.tarefa.descricao || '').trim(),
      responsavel: (this.tarefa.responsavel || '').trim(),
      prioridade: (this.tarefa.prioridade as any) || 'Média',
      status: (this.tarefa.status as any) || 'Pendente',
      dataLimite: this.tarefa.dataLimite
        ? String(this.tarefa.dataLimite)
        : new Date().toISOString().slice(0,10)
    };

    this.taskService.addTask(payload).subscribe({
      next: (res) => {
        alert('Tarefa criada com sucesso!');
        this.router.navigate(['/tasks']);
      },
      error: (err: any) => {
        console.error('Erro ao criar tarefa', err);
        alert('Erro ao criar tarefa. Veja console para detalhes.');
      }
    });
  }

  /*
    Atualiza uma tarefa já existente.
    Exige que exista this.tarefa.id.
    Prepara o payload completo mantendo datas e valores originais.
  */
  updateTask(): void {
    if (!this.tarefa.id) {
      console.warn('Tentativa de atualizar sem id');
      return;
    }

    const payload: Task = {
      id: this.tarefa.id,
      titulo: (this.tarefa.titulo || '').trim(),
      descricao: (this.tarefa.descricao || '').trim(),
      responsavel: (this.tarefa.responsavel || '').trim(),
      prioridade: (this.tarefa.prioridade as any) || 'Média',
      status: (this.tarefa.status as any) || 'Pendente',
      dataLimite: String(this.tarefa.dataLimite || new Date().toISOString().slice(0,10)),
      dataCriacao: (this.tarefa.dataCriacao as any) || new Date().toISOString().slice(0,10)
    };

    this.taskService.updateTask(payload).subscribe({
      next: () => {
        alert('Tarefa atualizada com sucesso!');
        this.router.navigate(['/tasks']);
      },
      error: (err: any) => {
        console.error('Erro ao atualizar tarefa', err);
        alert('Erro ao atualizar tarefa. Veja console para detalhes.');
      }
    });
  }

  /*
    Remove uma tarefa após confirmação do usuário.
  */
  deleteTask(id?: number): void {
    if (!id) {
      console.warn('deleteTask chamada sem id');
      return;
    }

    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;

    this.taskService.deleteTask(id).subscribe({
      next: () => {
        alert('Tarefa excluída com sucesso.');
        this.router.navigate(['/tasks']);
      },
      error: (err: any) => {
        console.error('Erro ao excluir tarefa', err);
        alert('Erro ao excluir tarefa. Veja console para detalhes.');
      }
    });
  }

  /*
    Navega de volta para a lista de tarefas.
  */
  cancel(): void {
    this.router.navigate(['/tasks']);
  }
}
