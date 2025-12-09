// frontend/src/app/pages/profile/profile.component.ts
// --------------------------------------------------
// Componente responsável pela edição dos dados do usuário logado.
// Ele carrega os dados do usuário do AuthService e envia atualizações
// para o backend usando a rota PUT /users/:id.
// --------------------------------------------------

import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

// Código de ativação exigido para salvar alterações
const CODIGO_ATIVACAO = '9999';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {

  // Identificador do usuário (necessário para PUT /users/:id)
  id: number | null = null;

  // Campos de perfil (dados do usuário)
  nomeCompleto = '';
  email = '';
  telefone = '';
  username = '';

  // Campos para atualização de senha
  password = '';
  confirmPassword = '';

  // Código de ativação exigido pelo backend
  codigoAtivacao = '';

  // Mensagens de feedback
  message = '';
  error = '';

  // Controle para evitar múltiplos envios
  submitting = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {

    // Tenta carregar o objeto completo salvo após login (setUserObject)
    const storedObj = this.authService.getUserObject();

    if (storedObj) {
      // Preenche automaticamente o formulário com as informações existentes
      this.id = storedObj.id || null;
      this.nomeCompleto = storedObj.nomeCompleto || storedObj.name || storedObj.username || '';
      this.email = storedObj.email || '';
      this.telefone = storedObj.telefone || '';
      this.username = storedObj.username || '';
      return; // finaliza inicialização
    }

    // Caso não exista userObject, utiliza nome simples salvo no AuthService
    const name = this.authService.getUsername();
    if (name) {
      this.nomeCompleto = name;
      // pega apenas o primeiro nome
      this.username = name.split(' ')[0] || '';
    }
  }

  // Verifica se senha atende aos requisitos mínimos.
  // Se a senha estiver vazia, o usuário não quer alterar → está ok.
  private validatePassword(password: string): boolean {
    if (!password) return true;
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d|.*[!@#$%^&*])(?=.{8,})/;
    return regex.test(password);
  }

  // Envia as atualizações do perfil para o backend
  saveProfile(): void {

    // Evita duplo clique
    if (this.submitting) return;

    this.error = '';
    this.message = '';

    // Validação: campos essenciais
    if (!this.nomeCompleto || !this.email) {
      this.error = 'Preencha nome completo e e-mail.';
      return;
    }

    // Código de ativação obrigatório
    if (this.codigoAtivacao !== CODIGO_ATIVACAO) {
      this.error = 'Código de ativação inválido. Use 9999.';
      return;
    }

    // Caso senha tenha sido informada, validar requisitos
    if (this.password) {

      // Verifica força da senha
      if (!this.validatePassword(this.password)) {
        this.error =
          'Senha não atende os requisitos (mínimo 8 caracteres, letras maiúsculas/minúsculas e número/símbolo).';
        return;
      }

      // Verifica se confirmação coincide
      if (this.password !== this.confirmPassword) {
        this.error = 'Confirmação de senha não confere.';
        return;
      }
    }

    // Monta o objeto com dados atualizados (apenas campos editáveis)
    const payload: any = {
      nomeCompleto: this.nomeCompleto.trim(),
      email: this.email.trim(),
      telefone: this.telefone.trim(),
      username: this.username.trim()
    };

    // Só envia senha se usuário digitou uma nova
    if (this.password) payload.password = this.password;

    // Valida que ID está disponível (necessário para PUT)
    if (!this.id) {
      this.error = 'ID do usuário ausente — reenvie o login e tente novamente.';
      return;
    }

    // Ativa estado de envio
    this.submitting = true;

    // Chama o AuthService → PUT /users/:id
    this.authService.updateUser(this.id, payload).subscribe({
      next: (res: any) => {

        this.submitting = false;

        // Mensagem de sucesso vinda do backend ou padrão
        this.message = res?.message || 'Perfil atualizado com sucesso.';
        this.error = '';

        // Backend retorna user atualizado → salva novamente no localStorage
        const updatedUser = res?.user || res;
        if (updatedUser) {
          this.authService.saveUserObject(updatedUser);
        }

        // Remove dados sensíveis da tela após salvar
        this.password = '';
        this.confirmPassword = '';
        this.codigoAtivacao = '';

        // Limpa mensagem depois de 3 segundos
        setTimeout(() => (this.message = ''), 3000);
      },

      error: (err) => {
        this.submitting = false;
        console.error('Erro ao atualizar perfil', err);
        this.error = err?.error?.message || 'Erro ao atualizar perfil.';
      }
    });
  }

  // Botão voltar → retorna para lista de tarefas
  backToList(): void {
    this.router.navigate(['/tasks']);
  }
}
