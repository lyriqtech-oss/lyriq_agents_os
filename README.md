# Agent Center by Lyriq

Plataforma para criar e operar agentes de IA em workspaces. Inclui chat, agentes especializados, documentos e memória, automações, integrações, métricas, permissões e planos.

## Desenvolvimento

Requer Node.js e npm.

```bash
npm ci
npm run dev
```

O frontend usa React, TypeScript e Vite. O backend está em `server.js` e usa Supabase. Configure as variáveis de ambiente necessárias ao seu ambiente antes de conectar os serviços.

## Verificação

```bash
npm run typecheck
npm test
npm run build
```

Os planos para automações e Lyriq Code estão em `docs/`. Eles descrevem objetivos do produto e não garantem que cada recurso esteja disponível na aplicação atual.
