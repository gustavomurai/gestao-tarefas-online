// app.module.ts

// importa funcionalidades essenciais para definir módulos no Angular
import { NgModule } from '@angular/core';
// módulo necessário para aplicações web rodarem no navegador
import { BrowserModule } from '@angular/platform-browser';
// módulo que habilita chamadas HTTP via HttpClient
import { HttpClientModule } from '@angular/common/http';
// módulo que habilita formulários baseados em template e uso de [(ngModel)]
import { FormsModule } from '@angular/forms';
// disponibiliza diretivas comuns como ngIf, ngFor e ngClass
import { CommonModule } from '@angular/common';

// componente raiz que inicia toda a aplicação
import { AppComponent } from './app.component';
// módulo responsável por carregar as rotas definidas
import { AppRoutingModule } from './app-routing.module';

// Importações dos Componentes de PÁGINAS
import { LoginComponent } from './pages/login/login.component';
import { TaskListComponent } from './pages/task-list/task-list.component';
import { RegisterComponent } from './pages/register/register.component';
import { TarefaFormComponent } from './pages/tarefa-form/tarefa-form.component';
import { TarefaDetalheComponent } from './pages/tarefa-detalhe/tarefa-detalhe.component';
import { ProfileComponent } from './pages/profile/profile.component';

// Importações dos Serviços
import { AuthService } from './services/auth.service';
import { TaskService } from './services/task.service';

// ⚠️ IMPORTAÇÃO NECESSÁRIA PARA EVITAR 404 AO DAR F5 (Vercel)
import { HashLocationStrategy, LocationStrategy } from '@angular/common';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    TaskListComponent,
    ProfileComponent,
    RegisterComponent,
    TarefaFormComponent,
    TarefaDetalheComponent
  ],

  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule, 
    FormsModule,
    CommonModule
  ],

  providers: [
    AuthService,
    TaskService,

    // ⬇️ ADICIONADO PARA IMPEDIR 404 AO ATUALIZAR A PÁGINA NO VERCEL
    { provide: LocationStrategy, useClass: HashLocationStrategy }
  ],

  bootstrap: [AppComponent]
})
export class AppModule { }
