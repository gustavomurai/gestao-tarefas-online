
// função usada para inicializar uma aplicação Angular no navegador
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

// importa o módulo principal da aplicação, que reúne componentes, rotas e serviços
import { AppModule } from './app/app.module';

// inicia a aplicação Angular carregando o AppModule
// platformBrowserDynamic() cria o ambiente necessário no navegador
platformBrowserDynamic().bootstrapModule(AppModule)
  // captura e exibe erros caso a inicialização falhe
  .catch(err => console.error(err));
