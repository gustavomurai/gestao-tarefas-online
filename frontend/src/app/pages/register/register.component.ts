// Arquivo principal do componente de registro de usuário.
// Responsável por coletar dados, validar localmente e enviar ao backend.

// Importa recursos do Angular necessários para componente, navegação e serviço de autenticação
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

// Código usado como etapa extra de verificação do cadastro
const CODIGO_VERIFICACAO = '9999'; // Código de teste

@Component({
  selector: 'app-register',                       // seletor usado no HTML
  templateUrl: './register.component.html',       // arquivo de template
  styleUrls: ['./register.component.css']         // estilos específicos do componente
})
export class RegisterComponent {
  // Campos do formulário
  username = '';
  password = '';
  confirmPassword = '';
  nomeCompleto = '';
  email = '';
  cpf = '';
  dataNascimento = '';
  telefone = '';
  codigoVerificacao = '';

  // Estados de exibição
  registerError = false;
  errorMessage = '';
  successMessage = '';
  submitting = false; // impede envio duplo

  // Texto exibido abaixo do campo de senha
  passwordHint = 'Mínimo 8 caracteres, com letra maiúscula, minúscula e símbolo.';

  // Injeta AuthService (responsável pela API de login/registro) e Router (para navegar após cadastro)
  constructor(private authService: AuthService, private router: Router) { }

  // =============================
  // Máscara CPF
  // =============================
  onCpfChange(): void {
    // Remove tudo que não for número
    let valor = this.cpf.replace(/\D/g, '');

    // Limita a 11 dígitos (tamanho padrão)
    if (valor.length > 11) valor = valor.substring(0, 11);

    // Aplica máscara conforme quantidade de dígitos
    if (valor.length > 9) {
      valor = valor.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (valor.length > 6) {
      valor = valor.replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3');
    } else if (valor.length > 3) {
      valor = valor.replace(/(\d{3})(\d{3})/, '$1.$2');
    }

    // Atualiza o campo formatado
    this.cpf = valor;
  }

  // =============================
  // Máscara Telefone
  // =============================
  onTelefoneChange(): void {
    // Remove tudo que não é número
    let valor = this.telefone.replace(/\D/g, '');

    // Limita a 11 dígitos (formato: DDD + 9 dígitos)
    if (valor.length > 11) valor = valor.substring(0, 11);

    // Aplica máscara dinâmica conforme a quantidade digitada
    if (valor.length > 10) {
      valor = valor.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (valor.length > 6) {
      valor = valor.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else if (valor.length > 2) {
      valor = valor.replace(/(\d{2})(\d+)/, '($1) $2');
    }

    // Atualiza o valor formatado
    this.telefone = valor;
  }

  // =============================
  // Validação de senha
  // =============================
  private validatePassword(password: string): boolean {
    // Regex exige:
    // - letra minúscula
    // - letra maiúscula
    // - número OU símbolo
    // - mínimo 8 caracteres
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d|.*[!@#$%^&*])(?=.{8,})/;
    return regex.test(password);
  }

  // =============================
  // Validações gerais
  // =============================
  isFormValidLocal(): boolean {
    // Verifica campos essenciais
    if (!this.username || !this.password || !this.confirmPassword || !this.email || !this.nomeCompleto)
      return false;

    // Verifica força da senha
    if (!this.validatePassword(this.password))
      return false;

    // Confirma se a senha bate com a confirmação
    if (this.password !== this.confirmPassword)
      return false;

    // Valida o código de verificação
    if (this.codigoVerificacao !== CODIGO_VERIFICACAO)
      return false;

    return true;
  }

  // =============================
  // Submit (ENVIA)
  // =============================
  onSubmit(): void {
    // Evita spam de envio sendo apertado repetidamente
    if (this.submitting) {
      console.log('Já enviando... aguarde');
      return;
    }

    // Reseta mensagens
    this.registerError = false;
    this.errorMessage = '';
    this.successMessage = '';

    // Validação final antes de enviar ao backend
    if (!this.isFormValidLocal()) {
      this.registerError = true;
      this.errorMessage = 'Preencha corretamente os campos, verifique a senha e confirme o código (9999).';

      // Log útil para depuração
      console.warn('Form inválido:', {
        username: this.username,
        nomeCompleto: this.nomeCompleto,
        email: this.email,
        senhaValida: this.validatePassword(this.password),
        senhaConfere: this.password === this.confirmPassword,
        codigo: this.codigoVerificacao
      });

      return;
    }

    // Prepara payload de envio
    const payload = {
      username: this.username,
      password: this.password,
      nomeCompleto: this.nomeCompleto,
      email: this.email,
      cpf: this.cpf,
      dataNascimento: this.dataNascimento,
      telefone: this.telefone
    };

    console.log('Tentando cadastrar usuário:', payload);

    // Marca como "enviando"
    this.submitting = true;

    // Envia ao backend via AuthService
    this.authService.register(payload).subscribe({
      next: (res: any) => {
        console.log('Resposta do register:', res);

        // Desmarca estado de envio
        this.submitting = false;

        // Exibe mensagem de sucesso
        this.successMessage = res?.message || 'Cadastro realizado com sucesso! Redirecionando ao login...';

        this.registerError = false;

        // Redireciona após pequeno delay
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 900);
      },

      error: (err) => {
        console.error('Erro ao cadastrar', err);

        this.submitting = false;
        this.registerError = true;

        // Tenta pegar a mensagem do backend; se não houver, mostra genérica
        this.errorMessage =
          err?.error?.message ||
          err?.message ||
          'Erro ao tentar se cadastrar. Tente novamente.';
      }
    });
  }
}
