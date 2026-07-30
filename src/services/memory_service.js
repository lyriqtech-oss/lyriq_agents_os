import crypto from 'crypto';

/**
 * Normalize Memory Content for comparison & deduplication
 */
export function normalizeMemoryContent(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\sà-ú]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Zero-Secrets Policy Guard
 * Checks if content contains API keys, tokens, passwords, or credit card numbers
 */
export function containsSecretOrCredential(content) {
  if (!content || typeof content !== 'string') return false;
  const lower = content.toLowerCase();

  const secretPatterns = [
    /sk-[a-zA-Z0-9]{20,}/,
    /nvapi-[a-zA-Z0-9_-]{20,}/,
    /bearer\s+[a-zA-Z0-9\._-]{20,}/i,
    /ghp_[a-zA-Z0-9]{30,}/,
    /eyJ[a-zA-Z0-9_-]{30,}\.eyJ[a-zA-Z0-9_-]{30,}/, // JWT token
    /\b(?:senha|password|passwd|app_password)\s*[:=]\s*\S+/i,
    /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/ // Credit card
  ];

  return secretPatterns.some(pattern => pattern.test(content));
}

/**
 * Candidate Memory Detector
 * Identifies explicit & implicit operational rules, preferences, and decisions in conversations
 */
export function detectMemoryCandidates({ messageText, agentId = null, conversationId = null }) {
  if (!messageText || typeof messageText !== 'string') return null;
  const lower = messageText.toLowerCase();

  // Zero secrets check
  if (containsSecretOrCredential(messageText)) {
    return {
      blocked: true,
      reason: 'memory_secret_detected',
      message: 'Detecção de credencial ou chave secreta. Salvamento bloqueado por segurança.'
    };
  }

  const candidateTriggers = [
    { regex: /(?:lembra que|lembre-se de que|grava isso|anota aí)\s+(.+)/i, type: 'fact', importance: 'high' },
    { regex: /(?:sempre faça|nunca faça|daqui pra frente|a partir de agora)\s+(.+)/i, type: 'policy', importance: 'critical' },
    { regex: /(?:minha preferência é|prefiro|gosto de|sempre responda em)\s+(.+)/i, type: 'preference', importance: 'medium' },
    { regex: /(?:decidimos que|vamos priorizar|a decisão foi)\s+(.+)/i, type: 'decision', importance: 'high' },
    { regex: /(?:todo pdf|toda imagem|comunicação pública)\s+(.+)/i, type: 'task_pattern', importance: 'high' }
  ];

  for (const trigger of candidateTriggers) {
    const match = messageText.match(trigger.regex);
    if (match && match[1]) {
      const proposedContent = match[1].trim();
      return {
        isCandidate: true,
        proposedType: trigger.type,
        proposedContent: proposedContent.charAt(0).toUpperCase() + proposedContent.slice(1),
        proposedScope: trigger.type === 'preference' ? 'user' : 'workspace',
        proposedImportance: trigger.importance,
        proposedSensitivity: 'internal',
        confidence: 0.9,
        requiresHumanApproval: trigger.importance === 'critical' || trigger.type === 'decision'
      };
    }
  }

  return null;
}

/**
 * Fit Memories into Context Token Budget
 * critical_memory_tokens: 700, retrieved_memory_tokens: 1200, max_total_tokens: 2500
 */
export function fitMemoriesIntoBudget(memories = [], options = {}) {
  const maxTotalTokens = options.maxTotalTokens || 2500;
  const criticalTokensBudget = options.criticalTokensBudget || 700;
  const retrievedTokensBudget = options.retrievedTokensBudget || 1200;

  const criticalMemories = [];
  const retrievedMemories = [];

  let currentCriticalTokens = 0;
  let currentRetrievedTokens = 0;

  // 1. Separate Critical Pinned Memories
  const sorted = [...memories].sort((a, b) => {
    if (a.importance === 'critical' && b.importance !== 'critical') return -1;
    if (b.importance === 'critical' && a.importance !== 'critical') return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  for (const mem of sorted) {
    const estimatedTokens = Math.ceil((mem.content || '').length / 4);

    if (mem.importance === 'critical' && currentCriticalTokens + estimatedTokens <= criticalTokensBudget) {
      criticalMemories.push(mem);
      currentCriticalTokens += estimatedTokens;
    } else if (currentRetrievedTokens + estimatedTokens <= retrievedTokensBudget) {
      retrievedMemories.push(mem);
      currentRetrievedTokens += estimatedTokens;
    }
  }

  return {
    selectedMemories: [...criticalMemories, ...retrievedMemories],
    criticalCount: criticalMemories.length,
    retrievedCount: retrievedMemories.length,
    usedTokens: currentCriticalTokens + currentRetrievedTokens,
    maxTotalTokens
  };
}

/**
 * Format Agent Memory Context Prompt with operational instructions
 */
export function formatAgentMemoryContext(selectedMemories = []) {
  if (!selectedMemories || selectedMemories.length === 0) {
    return null;
  }

  let formatted = `Memórias e Contexto Operacional Ativo:\n\n`;

  const grouped = {
    critical: selectedMemories.filter(m => m.importance === 'critical' || m.type === 'policy'),
    preferences: selectedMemories.filter(m => m.type === 'preference' || m.scope === 'user'),
    operational: selectedMemories.filter(m => m.type === 'decision' || m.type === 'task_pattern' || m.type === 'fact')
  };

  if (grouped.critical.length > 0) {
    formatted += `[Políticas Críticas & Segurança]\n`;
    grouped.critical.forEach(m => { formatted += `- ${m.content}\n`; });
    formatted += `\n`;
  }

  if (grouped.preferences.length > 0) {
    formatted += `[Preferências do Usuário]\n`;
    grouped.preferences.forEach(m => { formatted += `- ${m.content}\n`; });
    formatted += `\n`;
  }

  if (grouped.operational.length > 0) {
    formatted += `[Contexto do Projeto & Decisões Operacionais]\n`;
    grouped.operational.forEach(m => { formatted += `- ${m.content}\n`; });
    formatted += `\n`;
  }

  formatted += `Essas memórias são diretrizes operacionais internas do workspace. Mantenha a continuidade do contexto sem revelar a estrutura interna ao usuário.`;

  return formatted;
}
