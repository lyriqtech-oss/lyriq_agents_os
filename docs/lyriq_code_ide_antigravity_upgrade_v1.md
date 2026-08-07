# Lyriq Code - Upgrade IDE estilo Antigravity V1

## Objetivo

Transformar o Lyriq Code em um ambiente de desenvolvimento real, com experiencia de IDE, suporte a pastas/projetos e agente capaz de criar, editar, organizar, executar, testar e explicar alteracoes.

O alvo nao e parecer um editor fake. O alvo e operar como workspace de desenvolvimento assistido por IA.

## Experiencia principal

O usuario deve poder:

- abrir uma pasta ou projeto;
- navegar por arquivos e subpastas;
- criar, renomear, mover e excluir arquivos;
- editar codigo com abas;
- pedir alteracoes ao agente;
- ver diff antes de aplicar;
- rodar comandos;
- executar testes;
- visualizar preview;
- acompanhar logs;
- fazer commit e deploy quando autorizado.

## Layout

### 1. Sidebar Explorer

Deve suportar:

- arvore de pastas;
- busca por arquivo;
- botoes de novo arquivo e nova pasta;
- menu de contexto;
- estados de arquivo modificado;
- destaque de arquivo ativo;
- arquivos ignorados por seguranca.

### 2. Editor com abas

Recursos esperados:

- multiplas abas;
- indicador de alteracao nao salva;
- syntax highlighting;
- minimap opcional;
- split editor;
- breadcrumbs;
- atalhos de salvar, formatar e buscar.

### 3. Painel do agente

O agente deve receber objetivos, nao apenas prompts soltos.

Exemplo:

> Melhore a tela de onboarding, preserve o design atual, rode build e me mostre o diff.

O agente deve responder com:

- plano curto;
- arquivos que pretende mexer;
- diff;
- comandos executados;
- erros encontrados;
- resultado final.

### 4. Terminal e tarefas

Painel inferior com:

- terminal;
- logs;
- testes;
- problemas;
- git;
- preview server;
- tarefas em andamento.

### 5. Preview

Preview deve suportar:

- web;
- mobile app mock;
- jogos 2D/3D;
- estados de loading, erro e sucesso;
- reload automatico;
- status de build.

## Modelo de projeto

```ts
interface CodeProject {
  id: string;
  workspaceId: string;
  name: string;
  rootPath: string;
  type: 'web' | 'app' | 'api' | 'game' | 'automation' | 'library';
  runtime: 'vite' | 'next' | 'node' | 'python' | 'react-native' | 'custom';
  status: 'idle' | 'building' | 'testing' | 'ready' | 'failed';
}

interface CodeFileNode {
  id: string;
  projectId: string;
  path: string;
  kind: 'file' | 'folder';
  language?: string;
  modified: boolean;
  readonly: boolean;
}
```

## Ferramentas do agente

Ferramentas necessarias:

- `list_files`;
- `read_file`;
- `write_file`;
- `create_file`;
- `create_folder`;
- `move_path`;
- `delete_path`;
- `search_code`;
- `apply_patch`;
- `run_command`;
- `run_tests`;
- `open_preview`;
- `capture_screenshot`;
- `git_status`;
- `git_diff`;
- `git_commit`;
- `deploy_preview`.

## Regras de seguranca

O agente nao deve:

- expor `.env`;
- apagar projeto inteiro sem confirmacao;
- commitar segredos;
- rodar comando destrutivo sem aprovacao;
- instalar dependencia suspeita sem justificativa;
- fazer deploy de producao sem aprovacao;
- alterar cobranca, legal ou seguranca sem destaque.

## Diferencial contra IDE comum

O Lyriq Code deve ser mais agente do que editor:

- entende objetivo de produto;
- faz mudancas multi-arquivo;
- cria estrutura de projeto;
- corrige build;
- valida com teste;
- gera resumo executivo;
- conecta com automacoes e agentes do workspace.

## MVP

1. Explorer com pastas.
2. Editor com abas.
3. Prompt do agente por projeto.
4. Terminal visual.
5. Preview.
6. Diff antes de aplicar.
7. Estado de build.
8. Git status e commit assistido.

## Proxima fase

1. Branches por tarefa.
2. Preview deploy.
3. Sandbox isolado por projeto.
4. Colaboracao em tempo real.
5. Agentes especialistas por stack.
6. Templates de app, landing, API, dashboard e jogo.
