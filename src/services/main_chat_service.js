/**
 * Main Chat / Agent Workspace V1 Service Module
 * Handles conversation management, agent switching, message runs, real-time events, inline approvals & task conversion.
 */

import { PolicyEngine } from './security_service.js';

const ORCHESTRATION_AGENT_PROFILES = [
  {
    id: 'agent-ops-orchestrator',
    name: 'Agente Operações',
    role: 'Orquestrador operacional',
    area: 'operations',
    keywords: ['tarefa', 'processo', 'prazo', 'operação', 'operacao', 'prioridade', 'fluxo', 'projeto'],
    defaultModel: 'gpt-4o-mini'
  },
  {
    id: 'agent-tech',
    name: 'Agente Tecnologia',
    role: 'Especialista técnico',
    area: 'technology',
    keywords: ['api', 'bug', 'deploy', 'código', 'codigo', 'integração', 'integracao', 'sistema', 'dados', 'backend', 'frontend'],
    defaultModel: 'gpt-4o-mini'
  },
  {
    id: 'agent-marketing',
    name: 'Agente Marketing',
    role: 'Estrategista de crescimento',
    area: 'marketing',
    keywords: ['conteúdo', 'conteudo', 'post', 'campanha', 'lead', 'copy', 'marca', 'social', 'landing'],
    defaultModel: 'gpt-4o-mini'
  },
  {
    id: 'agent-finance',
    name: 'Agente Financeiro',
    role: 'Analista financeiro',
    area: 'finance',
    keywords: ['custo', 'preço', 'preco', 'faturamento', 'assinatura', 'crédito', 'credito', 'roi', 'orçamento', 'orcamento'],
    defaultModel: 'gpt-4o-mini'
  },
  {
    id: 'agent-support',
    name: 'Agente Suporte',
    role: 'Especialista de atendimento',
    area: 'support',
    keywords: ['cliente', 'ticket', 'suporte', 'sla', 'whatsapp', 'email', 'atendimento', 'chamado'],
    defaultModel: 'gpt-4o-mini'
  }
];

const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

const normalizeAgent = (agent = {}, fallback = {}) => ({
  ...fallback,
  ...agent,
  id: agent.id || fallback.id || makeId('agent'),
  name: agent.name || fallback.name || 'Agente',
  role: agent.role || fallback.role || 'Especialista',
  area: (agent.area || fallback.area || agent.category || 'operations').toLowerCase(),
  defaultModel: agent.defaultModel || agent.model || fallback.defaultModel || 'gpt-4o-mini',
  defaultProvider: agent.defaultProvider || fallback.defaultProvider || 'openai'
});

const isAgentRunnable = (agent) => {
  const status = agent.agentStatus || agent.status || 'active';
  return status !== false && status !== 'paused' && status !== 'archived' && status !== 'failed';
};

const scoreAgentForTask = (agent, userText = '') => {
  const haystack = `${userText} ${agent.area || ''} ${agent.role || ''} ${agent.name || ''}`.toLowerCase();
  const profile = ORCHESTRATION_AGENT_PROFILES.find(p => p.area === agent.area) || { keywords: [] };
  let score = 0;
  for (const keyword of profile.keywords || []) {
    if (haystack.includes(keyword.toLowerCase())) score += 3;
  }
  if ((agent.type || '').toLowerCase() === 'main') score += 2;
  if ((agent.role || '').toLowerCase().includes('coorden')) score += 2;
  if ((agent.role || '').toLowerCase().includes('orquestr')) score += 2;
  return score;
};

export function selectOrchestrationAgents({ agents = [], userText = '', maxAgents = 4 }) {
  const existing = (agents || []).filter(isAgentRunnable).map(a => normalizeAgent(a));
  const fallback = ORCHESTRATION_AGENT_PROFILES.map(p => normalizeAgent({}, p));
  const pool = existing.length > 0 ? existing : fallback;

  const scored = pool
    .map(agent => ({ agent, score: scoreAgentForTask(agent, userText) }))
    .sort((a, b) => b.score - a.score || a.agent.name.localeCompare(b.agent.name));

  const selected = [];
  const coordinator = scored.find(item => item.agent.type === 'main' || item.agent.role.toLowerCase().includes('coorden') || item.agent.role.toLowerCase().includes('orquestr'));
  if (coordinator) selected.push(coordinator.agent);

  for (const item of scored) {
    if (selected.some(a => a.id === item.agent.id)) continue;
    selected.push(item.agent);
    if (selected.length >= maxAgents) break;
  }

  return selected.slice(0, Math.max(1, maxAgents));
}

const buildSpecialistFinding = (agent, userText) => {
  const text = userText.toLowerCase();
  if (agent.area === 'technology') {
    return text.includes('deploy') || text.includes('produção')
      ? 'Validar impacto técnico, testes mínimos, logs e rollback antes de qualquer alteração em produção.'
      : 'Quebrar a execução em módulos pequenos, criar endpoints testáveis e manter fallback seguro quando provider/API falhar.';
  }
  if (agent.area === 'marketing') {
    return 'Transformar a entrega em mensagem clara de valor, com posicionamento consistente e CTA revisado antes de publicação externa.';
  }
  if (agent.area === 'finance') {
    return 'Checar custo estimado, limite do plano, consumo de créditos e bloquear ações que possam gerar gasto sem aprovação.';
  }
  if (agent.area === 'support') {
    return 'Garantir rastreabilidade da conversa, tom de atendimento e escalonamento humano quando houver SLA, cliente irritado ou promessa sensível.';
  }
  return 'Organizar prioridades, dependências, dono da próxima ação e critério objetivo de conclusão.';
};

const detectTaskRisk = (userText = '') => {
  const text = userText.toLowerCase();
  const external = ['enviar', 'publicar', 'email', 'whatsapp', 'cliente', 'deploy', 'produção', 'producao'].some(k => text.includes(k));
  const destructive = ['deletar', 'excluir', 'apagar', 'remover banco', 'drop', 'cancelar assinatura'].some(k => text.includes(k));
  if (destructive) return { level: 'critical', requiresApproval: true, reason: 'Pedido contém ação destrutiva ou irreversível.' };
  if (external) return { level: 'high', requiresApproval: true, reason: 'Pedido pode envolver ação externa, reputacional ou produção.' };
  return { level: 'medium', requiresApproval: false, reason: 'Execução interna controlada.' };
};

export function orchestrateMultiAgentTask({ conversationId, agents = [], userText = '', workspaceId = 'workspace_123', maxAgents = 4 }) {
  if (!userText || typeof userText !== 'string' || userText.trim().length === 0) {
    return { error: 'Texto da tarefa é obrigatório para orquestração.' };
  }

  const selectedAgents = selectOrchestrationAgents({ agents, userText, maxAgents });
  const risk = detectTaskRisk(userText);
  const orchestrationRunId = makeId('orun');
  const createdAt = new Date().toISOString();

  const participantRuns = selectedAgents.map((agent, index) => ({
    id: makeId('run'),
    workspaceId,
    conversationId,
    orchestrationRunId,
    agentId: agent.id,
    agentName: agent.name,
    role: agent.role,
    area: agent.area,
    status: 'completed',
    provider: agent.defaultProvider || 'openai',
    model: agent.defaultModel || 'gpt-4o-mini',
    order: index + 1,
    finding: buildSpecialistFinding(agent, userText),
    startedAt: createdAt,
    completedAt: new Date().toISOString(),
    createdAt
  }));

  const decisions = participantRuns.map(run => ({
    agentId: run.agentId,
    agentName: run.agentName,
    area: run.area,
    recommendation: run.finding
  }));

  const nextTasks = [
    {
      id: makeId('task'),
      workspaceId,
      title: 'Consolidar plano multiagente',
      description: `Consolidar execução para: ${userText.slice(0, 180)}`,
      status: 'todo',
      priority: risk.level === 'critical' ? 'urgent' : 'high',
      sourceType: 'orchestration',
      sourceId: orchestrationRunId,
      assignedAgentId: selectedAgents[0]?.id,
      createdAt
    },
    {
      id: makeId('task'),
      workspaceId,
      title: 'Executar validação mínima',
      description: 'Rodar teste, build, lint ou smoke test antes de marcar como pronto.',
      status: 'todo',
      priority: 'high',
      sourceType: 'orchestration',
      sourceId: orchestrationRunId,
      assignedAgentId: selectedAgents.find(a => a.area === 'technology')?.id || selectedAgents[0]?.id,
      createdAt
    }
  ];

  const events = [
    {
      id: makeId('runevt'),
      workspaceId,
      runId: orchestrationRunId,
      agentRunId: orchestrationRunId,
      conversationId,
      type: 'orchestration_started',
      status: 'info',
      title: 'Orquestração multiagente iniciada',
      message: `${selectedAgents.length} agente(s) selecionados para cooperar.`,
      visibleToUser: true,
      createdAt
    },
    ...participantRuns.map(run => ({
      id: makeId('runevt'),
      workspaceId,
      runId: run.id,
      agentRunId: run.id,
      orchestrationRunId,
      conversationId,
      type: 'agent_finding',
      status: 'success',
      title: `${run.agentName} concluiu análise`,
      message: run.finding,
      visibleToUser: true,
      createdAt: new Date().toISOString()
    }))
  ];

  let approvalRequest = null;
  if (risk.requiresApproval) {
    approvalRequest = {
      id: makeId('approval'),
      workspaceId,
      agentId: selectedAgents[0]?.id || 'agent-main',
      agentName: selectedAgents[0]?.name || 'Agente Main',
      actionType: 'orchestration_sensitive_action',
      actionPayload: userText,
      riskLevel: risk.level,
      reason: risk.reason,
      status: 'pending',
      sourceType: 'orchestration',
      sourceId: orchestrationRunId,
      createdAt: new Date().toISOString()
    };
    events.push({
      id: makeId('runevt'),
      workspaceId,
      runId: orchestrationRunId,
      agentRunId: orchestrationRunId,
      conversationId,
      type: 'approval_required',
      status: 'warning',
      title: 'Aprovação humana necessária',
      message: risk.reason,
      visibleToUser: true,
      createdAt: new Date().toISOString()
    });
  }

  const orchestrationRun = {
    id: orchestrationRunId,
    workspaceId,
    conversationId,
    type: 'multi_agent_orchestration',
    status: approvalRequest ? 'waiting_approval' : 'completed',
    input: userText,
    selectedAgentIds: selectedAgents.map(a => a.id),
    riskLevel: risk.level,
    requiresApproval: Boolean(approvalRequest),
    startedAt: createdAt,
    completedAt: approvalRequest ? null : new Date().toISOString(),
    createdAt
  };

  const assistantMessage = {
    id: makeId('msg'),
    workspaceId,
    conversationId,
    senderType: 'agent',
    agentId: selectedAgents[0]?.id || 'agent-main',
    role: 'assistant',
    contentText: [
      `Orquestração multiagente concluída com ${selectedAgents.length} agente(s).`,
      `Risco: ${risk.level}${approvalRequest ? ' | aguardando aprovação humana antes de ação sensível' : ''}.`,
      ...decisions.map(d => `- ${d.agentName}: ${d.recommendation}`)
    ].join('\n'),
    metadata: { mode: 'multi_agent_orchestration', orchestrationRunId },
    createdAt: new Date().toISOString()
  };

  return {
    orchestrationRun,
    selectedAgents,
    participantRuns,
    events,
    decisions,
    nextTasks,
    assistantMessage,
    approvalRequest,
    risk
  };
}

/**
 * Switch Active Agent in Conversation
 * Changes active agent and records audit event 'conversation.agent_switched'
 */
export function switchConversationAgent({ conversation, newAgent, workspaceId = 'workspace_123' }) {
  if (!conversation || !newAgent) {
    return { error: 'Conversa ou Agente não especificado.' };
  }

  const previousAgentId = conversation.activeAgentId;
  conversation.activeAgentId = newAgent.id;
  conversation.updatedAt = new Date().toISOString();

  const auditEvent = {
    id: `secevt-${Date.now()}`,
    workspaceId,
    actorType: 'user',
    eventType: 'conversation.agent_switched',
    severity: 'low',
    source: 'main_chat_workspace',
    metadata: {
      conversationId: conversation.id,
      previousAgentId,
      newAgentId: newAgent.id,
      newAgentName: newAgent.name
    },
    createdAt: new Date().toISOString()
  };

  return {
    success: true,
    conversation,
    auditEvent,
    userNotice: `Você está trocando o agente desta conversa para ${newAgent.name}. O novo agente responderá a partir daqui.`
  };
}

/**
 * Generate Automatic Conversation Title
 * Creates a short title based on the first user message
 */
export function generateConversationTitle(messages = []) {
  const firstUserMsg = messages.find(m => m.role === 'user' || m.senderType === 'user');
  if (!firstUserMsg || !firstUserMsg.contentText) return 'Nova Conversa';

  const text = firstUserMsg.contentText.trim();
  if (text.length <= 35) return text;

  // Shorten heuristics
  const words = text.split(' ').slice(0, 5).join(' ');
  return `${words}...`;
}

/**
 * Post Message & Trigger AgentRun Engine
 * Saves user message, creates agent_run, and generates execution timeline events
 */
export function postUserMessageAndRun({ conversationId, agent, userText, workspaceId = 'workspace_123' }) {
  const userMessage = {
    id: `msg-${Date.now()}-u`,
    workspaceId,
    conversationId,
    senderType: 'user',
    role: 'user',
    contentText: userText,
    createdAt: new Date().toISOString()
  };

  const agentRun = {
    id: `run-${Date.now()}`,
    workspaceId,
    conversationId,
    triggerMessageId: userMessage.id,
    agentId: agent.id,
    status: 'completed',
    provider: agent.defaultProvider || 'openai',
    model: agent.defaultModel || 'gpt-4o-mini',
    inputTokens: 320,
    outputTokens: 140,
    costCredits: 0.46,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  // Generate intermediate run events for the timeline
  const events = [
    {
      id: `runevt-${Date.now()}-1`,
      workspaceId,
      agentRunId: agentRun.id,
      conversationId,
      type: 'thinking',
      status: 'info',
      title: 'Analisando mensagem do usuário',
      message: `Agente ${agent.name} carregou a intenção e regras de negócio.`,
      visibleToUser: true,
      createdAt: new Date().toISOString()
    },
    {
      id: `runevt-${Date.now()}-2`,
      workspaceId,
      agentRunId: agentRun.id,
      conversationId,
      type: 'memory_retrieval',
      status: 'info',
      title: 'Buscando memórias do workspace',
      message: 'Recuperadas 2 memórias operacionais ativas.',
      visibleToUser: true,
      createdAt: new Date().toISOString()
    },
    {
      id: `runevt-${Date.now()}-3`,
      workspaceId,
      agentRunId: agentRun.id,
      conversationId,
      type: 'rag_search',
      status: 'info',
      title: 'Consultando base de conhecimento',
      message: 'Encontrados 2 trechos relevantes em manual_atendimento.pdf',
      visibleToUser: true,
      createdAt: new Date().toISOString()
    }
  ];

  // Evaluate tool use if user text contains sensitive action keywords
  let requiresApproval = false;
  let approvalCard = null;

  if (userText.toLowerCase().includes('enviar') || userText.toLowerCase().includes('proposta') || userText.toLowerCase().includes('email')) {
    const evalRes = PolicyEngine.evaluateToolUse({ toolName: 'send_email', agentId: agent.id, workspaceId });
    if (evalRes.decision === 'require_approval') {
      requiresApproval = true;
      agentRun.status = 'waiting_approval';
      events.push({
        id: `runevt-${Date.now()}-4`,
        workspaceId,
        agentRunId: agentRun.id,
        conversationId,
        type: 'approval_required',
        status: 'warning',
        title: 'Ação sensível detectada',
        message: 'Envio de e-mail/proposta requer aprovação humana prévia.',
        visibleToUser: true,
        createdAt: new Date().toISOString()
      });

      approvalCard = {
        approvalId: `approval-${Date.now()}`,
        action: 'send_email',
        target: 'proposta_comercial@cliente.com',
        riskLevel: evalRes.riskLevel,
        status: 'waiting_approval',
        reason: evalRes.reasons[0] || 'Ação sensível em canal externo'
      };
    }
  }

  const assistantMessage = {
    id: `msg-${Date.now()}-a`,
    workspaceId,
    conversationId,
    senderType: 'agent',
    agentId: agent.id,
    role: 'assistant',
    contentText: requiresApproval
      ? `Processei sua solicitação. Montei a proposta comercial, porém esta ação exige sua aprovação antes do envio.`
      : `Com base nas informações do workspace, processei sua solicitação com sucesso.`,
    createdAt: new Date().toISOString()
  };

  return {
    userMessage,
    agentRun,
    events,
    assistantMessage,
    requiresApproval,
    approvalCard
  };
}

/**
 * Cancel Running AgentRun
 * Cancels an ongoing execution and logs the cancellation status
 */
export function cancelAgentRun({ agentRun, reason = 'Cancelado pelo usuário' }) {
  if (!agentRun) return { error: 'AgentRun não encontrado.' };

  agentRun.status = 'cancelled';
  agentRun.errorMessage = reason;
  agentRun.completedAt = new Date().toISOString();

  return {
    success: true,
    agentRun,
    userNotice: 'Execução do agente interrompida. Nenhuma ação pendente foi executada.'
  };
}

/**
 * Create Task Link from Conversation
 * Converts conversation or request into a linked task
 */
export function createTaskFromConversation({ conversationId, taskTitle, dueDate, workspaceId = 'workspace_123' }) {
  const newTask = {
    id: `task-${Date.now()}`,
    workspaceId,
    title: taskTitle || 'Revisar acompanhamento da conversa',
    status: 'pending',
    priority: 'high',
    dueDate: dueDate || new Date(Date.now() + 86400000).toISOString(),
    sourceType: 'conversation',
    sourceId: conversationId,
    createdAt: new Date().toISOString()
  };

  const contextLink = {
    id: `link-${Date.now()}`,
    workspaceId,
    conversationId,
    contextType: 'task',
    contextId: newTask.id,
    label: `Tarefa: ${newTask.title}`,
    createdAt: new Date().toISOString()
  };

  return {
    task: newTask,
    contextLink
  };
}
