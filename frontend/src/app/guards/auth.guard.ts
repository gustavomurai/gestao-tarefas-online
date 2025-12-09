import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

// Guard de rota que impede acesso a páginas protegidas.
// O Angular chama esse guard antes de ativar a rota.
// Se retornar true -> rota é liberada.
// Se retornar false -> rota é bloqueada e usuário é redirecionado.
export const authGuard: CanActivateFn = (route, state) => {
  // injeta o serviço de autenticação sem precisar de construtor (próprio do Angular 15+)
  const authService = inject(AuthService);

  // injeta o Router para permitir redirecionamento quando usuário não estiver logado
  const router = inject(Router);

  // Verifica se o usuário está autenticado (token presente)
  if (authService.isAuthenticated()) {
    // Permite o acesso à rota normalmente
    return true;
  } else {
    // Se não estiver autenticado, redireciona para a página de login
    router.navigate(['/login']);
    return false; // Bloqueia a ativação da rota protegida
  }
};
