import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',                              // Nome do seletor usado no HTML
  templateUrl: './login.component.html',             // Arquivo de template associado
  styleUrls: ['./login.component.css']               // Estilos específicos do componente
})
export class LoginComponent {

  // Variáveis ligadas ao formulário de login (via ngModel)
  username = '';
  password = '';
  loginError = false;                                // Exibe mensagem de erro quando login falha

  // Variáveis do modal de recuperação de senha
  showResetModal = false;                            // Controla exibição do modal
  resetEmail = '';                                   // Email digitado no modal
  resetSent = false;                                 // Indica se o "email foi enviado" (simulado)

  constructor(
    private authService: AuthService,                // Serviço de autenticação
    private router: Router                           // Usado para navegar após login
  ) {}

  // Chamado quando o usuário clica em "Entrar"
  onSubmit(): void {
    this.loginError = false;

    // Validação simples -> não permite envio sem username ou senha
    if (!this.username || !this.password) {
      this.loginError = true;
      return;
    }

    // Chama o serviço de login (retorna Observable)
    this.authService.login({ username: this.username, password: this.password }).subscribe({
      next: (res) => {
        try {
          // Se authService possuir isAuthenticated() e retornar true → navega
          if (typeof this.authService.isAuthenticated === 'function' && this.authService.isAuthenticated()) {
            this.router.navigate(['/tasks']);
            return;
          }
        } catch (e) {}

        // Caso receba um token corretamente
        if (res && (res as any).token) {
          try { 
            localStorage.setItem('auth_token', (res as any).token);  // Salva token no navegador
          } catch {}

          this.router.navigate(['/tasks']);                          // Vai para tela de tarefas
        } else {
          // Falha no login → limpa senha e mostra erro
          this.loginError = true;
          this.password = '';
        }
      },

      error: (err) => {
        // Caso API retorne erro (401, 500, etc.)
        console.error('Erro de autenticação', err);
        this.loginError = true;
        this.password = '';
      }
    });
  }

  // Abre modal de "Esqueci minha senha"
  openResetModal(): void {
    this.resetEmail = '';                              // Limpa email
    this.resetSent = false;                            // Reseta estado
    this.showResetModal = true;                        // Exibe modal
  }

  // Fecha modal de recuperação
  closeResetModal(): void {
    this.showResetModal = false;
    this.resetEmail = '';
    this.resetSent = false;
  }

  // Ação simulada: marca como enviado e exibe mensagem de sucesso
  sendResetEmail(): void {
    if (!this.resetEmail) return;

    // Aqui seria chamada uma API real → mas é simulado
    this.resetSent = true;

    // Caso deseje fechar sozinho depois de alguns segundos:
    // setTimeout(() => this.closeResetModal(), 2500);
  }
}
