// src/app/services/auth.service.ts
// Serviço responsável pela autenticação do usuário.
// Controla: login, registro, salvamento de token, objeto do usuário,
// leitura de dados do usuário e logout. Tudo é salvo no localStorage
// para manter o usuário logado enquanto o navegador estiver aberto.

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  // Endereço base da API.
  // Usamos rota relativa '/api' para que, em produção no Vercel,
  // as requisições apontem para as funções serverless (ex.: /api/register).
  // Em desenvolvimento local, use proxy.conf.json ou ajuste conforme necessário.
  private apiUrl = '/api';

  // Chaves usadas no localStorage.
  private tokenKey = 'auth_token';        // token de autenticação
  private userKey = 'auth_user';          // nome curto (ex.: nome completo ou username)
  private userObjKey = 'auth_user_obj';   // objeto completo do usuário (JSON)

  constructor(private http: HttpClient, private router: Router) { }

  // Salva o token de autenticação no localStorage.
  private saveToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  // Salva o nome curto do usuário para exibição em tela (header, por exemplo).
  private saveUser(name: string): void {
    if (!name) return;
    localStorage.setItem(this.userKey, name);
  }

  // Salva o objeto completo do usuário.
  // Também atualiza o nome curto automaticamente.
  public saveUserObject(obj: any): void {
    if (!obj) return;
    try {
      localStorage.setItem(this.userObjKey, JSON.stringify(obj));

      if (obj.nomeCompleto && typeof obj.nomeCompleto === 'string') {
        this.saveUser(obj.nomeCompleto);
      } else if (obj.username) {
        this.saveUser(obj.username);
      }

    } catch (e) {
      console.error('Erro ao salvar objeto de usuário', e);
    }
  }

  // Retorna o objeto salvo do usuário, ou null caso não exista.
  public getUserObject(): any | null {
    try {
      const raw = localStorage.getItem(this.userObjKey);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  // Remove o objeto salvo do usuário.
  public removeUserObject(): void {
    localStorage.removeItem(this.userObjKey);
  }

  // Retorna o nome curto do usuário salvo em localStorage.
  public getUsername(): string | null {
    return localStorage.getItem(this.userKey);
  }

  // Permite alterar manualmente o nome do usuário salvo.
  public setUser(name: string): void {
    this.saveUser(name);
  }

  // Retorna o token armazenado.
  public getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  // Verifica se existe token salvo → usado para validação de login.
  isAuthenticated(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  // Login: faz uma requisição POST ao backend e, se der certo,
  // salva token e objeto do usuário no localStorage.
  // Agora usa rota relativa '/api/login' para funcionar em produção no Vercel.
  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap((response: any) => {

        // Salva o token retornado pelo backend.
        if (response && response.token) {
          this.saveToken(response.token);
        }

        // Tenta capturar o objeto completo do usuário.
        const userObj = response?.user || response?.usuario || response?.data || null;

        if (userObj && typeof userObj === 'object') {
          this.saveUserObject(userObj);
          return;
        }

        // Se o backend não mandou objeto completo, tenta nome.
        const possibleFullName =
          response?.nomeCompleto ||
          response?.fullName ||
          response?.name;

        if (possibleFullName && possibleFullName.trim().length > 0) {
          this.saveUser(possibleFullName);
        } else {
          // Última opção: usa o username informado no login.
          this.saveUser(credentials.username || credentials.user || '');
        }
      })
    );
  }

  // Registro de usuário no backend.
  // Usa rota relativa '/api/register' para funcionar em produção no Vercel.
  register(user: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, user);
  }

  // Atualiza um usuário existente.
  // Necessário enviar o token no cabeçalho Authorization.
  public updateUser(id: number, payload: any): Observable<any> {
    const token = this.getToken();
    const headers: any = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return this.http.put(`${this.apiUrl}/users/${id}`, payload, { headers });
  }

  // Logout: limpa todos os dados armazenados localmente e redireciona para /login.
  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.removeUserObject();
    this.router.navigate(['/login']);
  }
}
