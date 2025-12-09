
// importa o decorator Component para transformar a classe em um componente Angular
import { Component } from '@angular/core';

@Component({
  // seletor usado para inserir este componente raiz no index.html
  selector: 'app-root',

  // define o template diretamente no próprio arquivo
  // o router-outlet funciona como um espaço onde as páginas das rotas serão exibidas
  template: '<router-outlet></router-outlet>',

  // lista de estilos específicos deste componente (aqui vazio)
  styles: []
})
export class AppComponent {
  // propriedade simples usada como título da aplicação
  // pode ser utilizada em templates caso necessário
  title = 'Gestao-tarefas';
}
