## TechRent - MVP de Chamados de TI

Este MVP centraliza o relato de problemas de TI, permite que administradores acompanhem a operacao e gerenciem perfis, e faz com que tecnicos assumam e concluam chamados com registro de manutencao, seguindo o modelo definido em `bd/`.

## Estrutura principal

- `bd/`
  - `schema.sql`: banco, tabelas e relacionamentos
  - `views.sql`: views usadas pelos dashboards
- `backend/`
  - API Express com JWT, rotas de autenticacao, chamados, equipamentos, manutencao, dashboard e usuarios
- `frontend/`
  - App Next.js com telas para login, dashboard, chamados, operacao, equipamentos e gestao de usuarios

`next-app/` e `techrent/` permanecem no repositorio como apps paralelos/template, mas o MVP funcional atual esta concentrado em `frontend/`.

## Stack

- Frontend: Next.js (App Router)
- Backend: Node.js + Express
- Autenticacao: JWT
- Banco: MySQL

## Modelo de dados

### Tabelas

`usuarios`

- perfis do sistema
- `nivel_acesso`: `cliente`, `admin`, `tecnico`

`equipamentos`

- inventario de ativos monitorados
- `status`: `operacional`, `em_manutencao`, `desativado`

`chamados`

- registro central das solicitacoes
- vincula cliente, equipamento e tecnico responsavel
- `prioridade`: `baixa`, `media`, `alta`
- `status`: `aberto`, `em_atendimento`, `resolvido`, `cancelado`

`historico_manutencao`

- registro do reparo executado
- vincula chamado, equipamento e tecnico

### Views

`view_equipamentos_operacionais`

- lista equipamentos aptos a receber novos chamados

`view_painel_tecnico`

- mostra chamados `aberto` ou `em_atendimento`
- inclui solicitante, equipamento e tecnico responsavel

`view_resumo_chamados`

- consolida chamados por status

`view_resumo_equipamentos`

- consolida equipamentos por status operacional

## Fluxos do MVP

### 1. Cliente abre um chamado

- faz login com perfil `cliente`
- seleciona um equipamento operacional
- envia `titulo`, `descricao`, `equipamento_id` e `prioridade`
- o backend cria o registro em `chamados` com status `aberto`
- o equipamento passa para `em_manutencao`

### 2. Administrador gerencia a operacao

- acessa o dashboard com os resumos vindos das views
- acompanha a fila de chamados
- pode iniciar atendimento atribuindo um tecnico responsavel
- gerencia equipamentos
- gerencia perfis de usuario pela tela de usuarios

### 3. Tecnico atende e conclui

- visualiza a fila em aberto ou em atendimento
- assume um chamado, mudando o status para `em_atendimento`
- registra o reparo em `historico_manutencao`
- ao registrar a manutencao, o backend conclui o chamado como `resolvido`
- o equipamento volta para `operacional`

## Regras importantes do fluxo atual

- um chamado nao pode ser marcado como `resolvido` diretamente pela rota de status
- a conclusao exige registro em `historico_manutencao`
- manutencao so pode ser registrada em chamado `em_atendimento`
- se o chamado tiver tecnico responsavel, apenas esse tecnico pode conclui-lo
- administradores podem atribuir tecnicos quando iniciam o atendimento

## Endpoints principais

### Autenticacao

- `POST /auth/registro`
- `POST /auth/login`

### Equipamentos

- `GET /equipamentos`
- `GET /equipamentos/:id`
- `POST /equipamentos` (`admin`)
- `PUT /equipamentos/:id` (`admin`)
- `DELETE /equipamentos/:id` (`admin`)

### Chamados

- `GET /chamados`
- `GET /chamados/:id`
- `POST /chamados` (`cliente`, `admin`)
- `PUT /chamados/:id/status` (`tecnico`, `admin`)

### Manutencao

- `GET /manutencao` (`admin`, `tecnico`)
- `POST /manutencao` (`tecnico`)

### Dashboard

- `GET /dashboard/admin` (`admin`)
- `GET /dashboard/tecnico` (`admin`, `tecnico`)

### Usuarios

- `GET /usuarios` (`admin`)
- `PUT /usuarios/:id/nivel-acesso` (`admin`)

## Setup do banco

Execute na ordem:

```sql
SOURCE bd/schema.sql;
SOURCE bd/views.sql;
```

## Seed demo

No backend, existe um seed para demonstracao:

```bash
npm run seed:demo
```

Usuarios criados:

- `admin@techrent.local / 12345678`
- `tecnico@techrent.local / 12345678`
- `cliente@techrent.local / 12345678`
