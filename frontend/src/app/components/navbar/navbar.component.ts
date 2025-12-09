import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavBarComponent {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  // Getter que monta a mensagem "Olá, Nome"
  // Pega o nome completo salvo no AuthService e extrai apenas o primeiro nome.
  get welcomeMessage(): string {
    const fullName = this.authService.getUsername();

    // Se não houver nome salvo, retorna string vazia (não exibe nada)
    if (!fullName) return '';

    // Remove espaços duplicados e separa o nome em partes
    const firstName = fullName.trim().split(' ')[0];

    // Retorna "Olá, Nome", garantindo que a primeira letra fique maiúscula
    return `Olá, ${firstName.charAt(0).toUpperCase() + firstName.slice(1)}`;
  }

  // Método chamado ao clicar no botão "Logout".
  // Pergunta se o usuário confirma a saída, limpa o token via AuthService
  // e redireciona para a página de login.
  onLogout(): void {
    if (confirm('Tem certeza que deseja sair da aplicação?')) {
      this.authService.logout();
      this.router.navigate(['/login']);
    }
  }

  // Verifica se o usuário está autenticado.
  // Essa informação é usada no template para exibir ou esconder a navbar.
  isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }

  // Navega para a página do perfil do usuário ao clicar em "Meu Perfil".
  goToProfile(): void {
    this.router.navigate(['/profile']);
  }
}
