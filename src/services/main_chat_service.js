/**
 * Main Chat / Agent Workspace V1 Service Module
 * Handles conversation management, agent switching, message runs, real-time events, inline approvals & task conversion.
 */

import { PolicyEngine } from './security_service.js';

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
