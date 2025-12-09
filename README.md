# 📌 Gestão de Tarefas – Angular + Node.js (Deploy Online via Vercel)

## 👥 Integrantes do Projeto
- **Gustavo Cerqueira Murai**
- **Igor Cerqueira Murai**

---

# 🚀 1. Introdução

Este projeto foi desenvolvido como parte do componente curricular de **Programação Web**, com o objetivo de construir um sistema completo de **Gestão de Tarefas**, utilizando **Angular** no frontend e **Node.js + Express** no backend.

A solução foi totalmente publicada na **Vercel**, que hospeda tanto o frontend quanto o backend por meio de **Vercel Serverless Functions**, garantindo rapidez, escalabilidade e disponibilidade.

O sistema permite:

- Criação, edição, listagem e exclusão de tarefas (CRUD completo)  
- Autenticação de usuários  
- Visualização detalhada de tarefas  
- Edição de perfil  
- Interface moderna e responsiva  
- Persistência de dados utilizando **Upstash (estrutura KV/Redis)** conforme integração da Vercel  

---

# 🌐 2. Aplicação Online

## 🔵 Frontend – Angular (Vercel)
➡️ URL Pública: *https://gestao-tarefas-extra.vercel.app/*

## 🟣 Backend – API Node.js (Serverless)
Endpoints ativos em:

```
https://gestao-tarefas-extra.vercel.app/api
```

Exemplos:

```
GET  /api/tasks
POST /api/tasks
GET  /api/login
POST /api/register
```

---

# 🧩 3. Problema Abordado

A falta de ferramentas simples e acessíveis para organização de tarefas prejudica produtividade em ambientes pessoais, acadêmicos e profissionais.  
Este projeto busca oferecer uma solução organizada, intuitiva e acessível totalmente online.

---

# 🎯 4. Objetivos do Projeto

### ✔ Objetivo Geral  
Criar um sistema Web moderno para **gestão completa de tarefas**, incluindo CRUD, autenticação e design responsivo.

### ✔ Objetivos Específicos  
- Criar arquitetura modular em Angular  
- Desenvolver API REST com Express  
- Utilizar JSON/Upstash como persistência  
- Implementar deploy online  
- Demonstrar boas práticas de desenvolvimento  

---

# 🛠️ 5. Tecnologias Utilizadas

## Frontend  
- Angular 17  
- TypeScript  
- HTML5 / CSS3  
- Angular Router  
- HttpClient  

## Backend  
- Node.js  
- Express.js  
- JSON / Upstash KV  
- API REST Serverless  

## Ferramentas  
- Git / GitHub  
- VS Code  
- Vercel  
- Upstash  

---

# 🏗️ 6. Arquitetura do Sistema

```
CLIENTE (Angular)
   |
   | HTTP Requests
   |
SERVIDOR (API Node.js/Express – Serverless)
   |
   | Persistência
   |
BASE DE DADOS (JSON / Upstash KV)
```

---

# 📂 7. Estrutura do Projeto

```
project/
│
├── api/                     
│   ├── data/
│   ├── login/
│   ├── register/
│   ├── tasks/
│   └── key.js
│
├── frontend/                
│   ├── src/
│   ├── angular.json
│   └── package.json
│
├── docs/                    
│
└── README.md
```

---

# 🧪 8. Como Executar Localmente

## Pré-requisitos

```
Node.js
npm
Angular CLI
```

---

## Backend

```
cd api
npm install
node index.js
```

Servidor:

```
http://localhost:3000
```

---

## Frontend

```
cd frontend
npm install
ng serve
```

Acesse:

```
http://localhost:4200
```

---

# 🖼️ 9. Telas do Sistema

As telas incluem: Login, Cadastro, Lista de Tarefas, Criar Tarefa, Editar, Detalhes, Perfil e Recuperação de Senha.

(As imagens devem estar na pasta `/docs`)

---

# 🔐 10. Backend

- API RESTful  
- Serverless (Vercel Functions)  
- Persistência JSON / Upstash  
- Rotas organizadas  
- Autenticação  

---

# 🖥️ 11. Frontend

- Angular 17  
- Componentes modulares  
- Guards de autenticação  
- Serviços de comunicação com API  
- Design responsivo  

---

# ✅ 12. Conclusão

O projeto entrega uma solução completa de gestão de tarefas totalmente funcional e hospedada online, demonstrando domínio de Angular, Node.js, APIs Serverless e boas práticas de desenvolvimento Web.
