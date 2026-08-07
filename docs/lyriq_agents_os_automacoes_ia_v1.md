# Lyriq Agents OS - Automacoes com Agente de IA V1

## Objetivo

Criar um modulo de automacoes estilo n8n, mas com uma diferenca central: o usuario descreve o processo em linguagem natural e um agente de IA monta, configura, testa e ajusta o fluxo.

O usuario avancado ainda pode editar nodes manualmente. O usuario comum nao precisa entender webhook, payload, API, token, cron ou condicional para criar automacoes uteis.

## Experiencia esperada

O usuario entra em Automações e escreve:

> Quando chegar um lead pelo WhatsApp, qualifique com o agente SDR, salve no CRM, envie uma resposta inicial e avise o time se o score passar de 80.

O Lyriq Agents OS deve:

1. Identificar gatilho, canais, agentes, tools e integrações necessárias.
2. Criar um fluxo visual com nodes conectados.
3. Sugerir credenciais ou conectores ausentes.
4. Classificar riscos e exigir aprovações quando necessário.
5. Gerar logs e simulação antes de ativar.
6. Permitir edição manual no canvas.
7. Monitorar execução, falhas, loops e custos.

## Componentes do modulo

### 1. Prompt Builder

Entrada conversacional onde o usuario descreve o processo.

Campos:

- objetivo da automacao;
- sistema de origem;
- sistema de destino;
- agente responsavel;
- condicoes;
- horario ou gatilho;
- dados que podem ser usados;
- acoes que exigem aprovacao.

### 2. AI Workflow Planner

Agente responsavel por transformar o pedido em plano estruturado.

Saida esperada:

```json
{
  "name": "Qualificacao automatica de leads",
  "risk_level": "medium",
  "missing_connections": ["whatsapp", "crm"],
  "nodes": [],
  "edges": [],
  "approval_rules": [],
  "test_cases": []
}
```

### 3. Canvas visual

Canvas com nodes editaveis:

- trigger;
- agent;
- api;
- filter;
- skill;
- memory;
- approval;
- delay;
- notification;
- webhook.

Cada node deve ter:

- nome;
- tipo;
- configuracao;
- credencial usada por referencia segura;
- input esperado;
- output gerado;
- nivel de risco;
- logs da ultima execucao.

### 4. Importacao n8n

O sistema deve aceitar JSON basico do n8n e converter para o formato interno do Lyriq.

Regras:

- preservar nome dos nodes;
- mapear conexoes;
- identificar credenciais como referencias, nunca copiar segredo cru;
- marcar nodes desconhecidos como `custom`;
- exigir revisao humana antes de ativar.

### 5. Simulador

Antes de ativar uma automacao, o usuario deve poder rodar uma simulacao.

O simulador deve mostrar:

- payload de entrada;
- caminho executado;
- decisoes do agente;
- chamadas externas planejadas;
- custo estimado;
- pontos que exigem aprovacao;
- erros provaveis.

### 6. Execucao segura

Automações devem rodar com:

- timeout por node;
- limite de tentativas;
- retry com backoff;
- idempotency key;
- bloqueio anti-loop;
- budget por fluxo;
- logs sanitizados;
- pausa automatica em falha repetida;
- permissao por workspace e usuario.

## Modelo de dados sugerido

```sql
create table automations (
  id uuid primary key,
  workspace_id uuid not null,
  name text not null,
  description text,
  status text not null default 'draft',
  source_prompt text,
  risk_level text not null default 'low',
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table automation_nodes (
  id uuid primary key,
  automation_id uuid references automations(id) on delete cascade,
  node_type text not null,
  name text not null,
  position_x int not null default 0,
  position_y int not null default 0,
  config jsonb not null default '{}',
  credential_ref text,
  risk_level text not null default 'low'
);

create table automation_edges (
  id uuid primary key,
  automation_id uuid references automations(id) on delete cascade,
  source_node_id uuid not null,
  target_node_id uuid not null,
  condition jsonb
);

create table automation_runs (
  id uuid primary key,
  automation_id uuid references automations(id) on delete cascade,
  status text not null,
  input jsonb,
  output jsonb,
  cost_estimate numeric,
  started_at timestamptz default now(),
  finished_at timestamptz
);
```

## Permissoes

Acoes de baixo risco podem rodar direto:

- classificar lead;
- criar tarefa interna;
- resumir documento;
- atualizar campo nao sensivel.

Acoes medias exigem configuracao explicita:

- enviar mensagem externa;
- criar registro em CRM;
- alterar status de ticket;
- notificar canais conectados.

Acoes altas exigem aprovacao humana:

- pagamento;
- exclusao;
- envio em massa;
- mudanca de permissao;
- publicacao externa;
- assinatura de contrato;
- alteracao de preco.

## MVP

1. Prompt para gerar fluxo.
2. Canvas com nodes editaveis.
3. Importar/exportar JSON.
4. Simulacao visual.
5. Agendamento cron.
6. Logs por execucao.
7. Pausa automatica em erro.
8. Regras de aprovacao por risco.

## Resultado esperado

O Lyriq Agents OS deixa de ser apenas uma plataforma de agentes e vira uma camada operacional. O diferencial nao e copiar o n8n. O diferencial e fazer o trabalho chato de configuracao com IA, mantendo controle humano onde pode dar prejuizo.
