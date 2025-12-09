// app-routing.module.ts

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Importações das Páginas BÁSICAS
// componentes responsáveis por telas públicas e principais (login, cadastro, etc.)
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { TaskListComponent } from './pages/task-list/task-list.component';
import { ProfileComponent } from './pages/profile/profile.component';

// ⬇️ NOVAS IMPORTAÇÕES NECESSÁRIAS ⬇️
// componentes usados para criar/editar e visualizar detalhes de uma tarefa específica
import { TarefaFormComponent } from './pages/tarefa-form/tarefa-form.component'; 
import { TarefaDetalheComponent } from './pages/tarefa-detalhe/tarefa-detalhe.component';

// Importa o guard
// o guard controla quem pode acessar rotas protegidas; normalmente verifica autenticação
import { authGuard } from './guards/auth.guard'; 

// definição de todas as rotas da aplicação
// cada objeto descreve uma URL, o componente exibido e possíveis proteções
const routes: Routes = [
  // Rotas Públicas
  // disponíveis sem necessidade de login
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  
  // Rota Protegida (Lista de Tarefas)
  // usuário só acessa se o guard permitir (ex.: estiver logado)
  { path: 'tasks', component: TaskListComponent, canActivate: [authGuard] },
  
  // ⬇️ ROTAS DE CRIAÇÃO, EDIÇÃO E DETALHE (Corrigindo o erro de redirecionamento) ⬇️

  // 1. Rota de Criação: Para o botão "Criar Nova Tarefa"
  // abre o formulário vazio para cadastrar nova tarefa
  { path: 'tasks/new', component: TarefaFormComponent, canActivate: [authGuard] }, 
  
  // 2. Rota de Edição: Para o botão "Editar" (requer o ID)
  // utiliza o mesmo formulário, mas carregando a tarefa existente
  { path: 'tasks/edit/:id', component: TarefaFormComponent, canActivate: [authGuard] }, 
  
  // 3. Rota de Detalhe: Para o link no título da tarefa (requer o ID)
  // mostra uma página dedicada com as informações completas da tarefa
  { path: 'tasks/:id', component: TarefaDetalheComponent, canActivate: [authGuard] }, 
  
  // Redirecionamento Padrão
  // quando alguém acessa a raiz do site, é enviado para /login
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  
  // rota da página de perfil
  // também acessível somente depois do login (você pode adicionar o guard aqui depois, se quiser)
  { path: 'profile', component: ProfileComponent },
  
  // Rota Curinga (Captura URLs não reconhecidas)
  // evita erro 404, redirecionando para o login automaticamente
  { path: '**', redirectTo: '/login' } 
];

@NgModule({
  // registra as rotas no Angular
  imports: [RouterModule.forRoot(routes)],
  // permite que o módulo seja importado em outros lugares do app
  exports: [RouterModule]
})
export class AppRoutingModule { }
