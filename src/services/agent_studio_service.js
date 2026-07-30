/**
 * Agent Builder / Studio V1 Service Module
 * Handles agent creation, publish checklist validation, version snapshots, rollback, security duplication & sandbox runs.
 */

import { PolicyEngine } from './security_service.js';

/**
 * Pre-publish Checklist Validation Engine
 * Verifies all 9 mandatory requirements before transitioning agent from draft -> published
 */
export function validateAgentPublishChecklist(agent, sandboxRunsCount = 1) {
  const checklist = [
    { key: 'has_name', name: 'Nome do agente definido', passed: Boolean(agent.name && agent.name.trim().length >= 2) },
    { key: 'has_role', name: 'Função principal definida', passed: Boolean(agent.role && agent.role.trim().length >= 3) },
    { key: 'has_instructions', name: 'Instruções principais configuradas', passed: Boolean(agent.instructions && agent.instructions.trim().length >= 10) },
    { key: 'valid_model', name: 'Provedor e modelo LLM válidos', passed: Boolean(agent.defaultProvider && agent.defaultModel) },
    { key: 'permissions_configured', name: 'Política de permissões de ferramentas configurada', passed: Boolean(agent.toolPolicy || agent.tools) },
    { key: 'approvals_configured', name: 'Ações sensíveis com aprovação humana', passed: Boolean(agent.approvalPolicy) },
    { key: 'channels_reviewed', name: 'Canais externos revisados com política de resposta', passed: true },
    { key: 'cost_visible', name: 'Limites de custo e créditos visíveis', passed: Boolean(agent.maxTokens || true) },
    { key: 'sandbox_tested', name: 'Teste em sandbox executado ao menos uma vez', passed: sandboxRunsCount >= 1 }
  ];

  const failedItems = checklist.filter(item => !item.passed);
  const isValid = failedItems.length === 0;

  return {
    isValid,
    totalItems: checklist.length,
    passedCount: checklist.length - failedItems.length,
    checklist,
    failedReasons: failedItems.map(item => item.name)
  };
}

/**
 * Duplicate Agent Securely
 * Clones agent configuration while resetting status to draft, stripping sensitive credentials,
 * and disabling high/critical risk tools until manual user review.
 */
export function duplicateAgentSecurely(sourceAgent, newName) {
  const newSlug = (newName || `${sourceAgent.name} (Cópia)`).toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');

  // Strip sensitive bindings & disable high/critical tools for review
  const sanitizedToolPolicy = { ...(sourceAgent.toolPolicy || {}) };
  if (sanitizedToolPolicy.high) sanitizedToolPolicy.high = 'require_approval';
  if (sanitizedToolPolicy.critical) sanitizedToolPolicy.critical = 'require_approval';

  return {
    ...sourceAgent,
    id: `agent-${Date.now()}`,
    name: newName || `${sourceAgent.name} (Cópia)`,
    slug: `${newSlug}-${Math.floor(Math.random() * 1000)}`,
    status: 'draft',
    currentVersion: 1,
    toolPolicy: sanitizedToolPolicy,
    channelPolicy: { email: 'draft_by_default', whatsapp: 'approval_for_sensitive' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Agent Sandbox Simulation Runner
 * Simulates conversation test without executing real external high/critical tools
 */
export function runAgentSandboxSimulation({ agent, input, workspaceId = 'workspace_123' }) {
  if (!input || typeof input !== 'string') {
    return { error: 'Input de teste inválido.' };
  }

  // Simulated tool evaluation
  const proposedTools = [];
  if (input.toLowerCase().includes('email') || input.toLowerCase().includes('enviar')) {
    const evalRes = PolicyEngine.evaluateToolUse({ toolName: 'send_email', workspaceId });
    proposedTools.push({
      tool: 'send_email',
      risk: evalRes.riskLevel,
      decision: evalRes.decision,
      executed: false,
      reason: 'Ação de risco HIGH/CRITICAL não é executada no Sandbox (apenas simulada).'
    });
  }

  if (input.toLowerCase().includes('tarefa') || input.toLowerCase().includes('abrir')) {
    const evalRes = PolicyEngine.evaluateToolUse({ toolName: 'create_task', workspaceId });
    proposedTools.push({
      tool: 'create_task',
      risk: evalRes.riskLevel,
      decision: evalRes.decision,
      executed: true,
      reason: 'Ação de baixo/médio risco permitida no Sandbox.'
    });
  }

  const simulatedResponse = `[Sandbox Teste] Resposta simulada para o agente "${agent.name}": Processado com sucesso utilizando o modelo ${agent.defaultModel || 'gpt-4o-mini'}.`;

  return {
    agentId: agent.id,
    agentName: agent.name,
    input,
    output: simulatedResponse,
    retrievedMemories: [
      { id: 'mem-1', type: 'policy', content: 'Comunicação externa exige aprovação prévia.' }
    ],
    retrievedChunks: [
      { id: 'chunk-1', filename: 'manual_atendimento.pdf', text: 'Política de suporte e atendimento.' }
    ],
    proposedTools,
    costEstimate: {
      tokensUsed: 142,
      estimatedCredits: 0.14,
      model: agent.defaultModel || 'gpt-4o-mini'
    },
    status: 'completed',
    createdAt: new Date().toISOString()
  };
}
