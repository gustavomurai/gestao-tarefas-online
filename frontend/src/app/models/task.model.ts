// Interface que define o formato exato de uma Tarefa no sistema.
// Agora compatível com "dataCriacao" e também com "createdAt".

export interface Task {

  // Identificador único da tarefa (numérico sequencial)
  id: number;

  // Título da tarefa
  titulo: string;

  // Descrição
  descricao: string;

  // Data em que foi criada
  // Aceita tanto "dataCriacao" quanto "createdAt" vindos do backend
  dataCriacao?: string;
  createdAt?: string;

  // Data limite para conclusão
  dataLimite: string;

  // Status atual da tarefa
  status: 'Pendente' | 'Em Andamento' | 'Concluída';

  // Prioridade da tarefa
  prioridade: 'Baixa' | 'Média' | 'Alta';

  // Responsável
  responsavel: string;
}
