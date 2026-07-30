/**
 * Cybersecurity, Anti-Abuse & Data Protection V1 Service Module
 * Handles central authorization (PolicyEngine), secret redaction, security event logging, abuse scoring, and Admin Break-Glass sessions.
 */

/**
 * SecretRedactionService
 * Auto-redacts API keys, Bearer tokens, refresh tokens, and credentials from text and JSON logs
 */
export const SecretRedactionService = {
  redactText(text = '') {
    if (!text || typeof text !== 'string') return text;

    return text
      // Redact OpenAI / Anthropic / Provider keys
      .replace(/sk-[a-zA-Z0-9_\-]{20,}/g, 'sk-proj-***redacted***')
      .replace(/nvapi-[a-zA-Z0-9_\-]{20,}/g, 'nvapi-***redacted***')
      // Redact Bearer tokens
      .replace(/Bearer\s+[a-zA-Z0-9\-\._~\+\/]+=*/gi, 'Bearer ***redacted***')
      // Redact AWS / Stripe keys
      .replace(/(AKIA|ASIA)[A-Z0-9]{16}/g, '$1***redacted***')
      .replace(/rk_live_[a-zA-Z0-9]{24}/g, 'rk_live_***redacted***');
  },

  redactHeaders(headers = {}) {
    const sanitized = { ...headers };
    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey === 'authorization' || lowerKey === 'x-api-key' || lowerKey === 'cookie' || lowerKey.includes('secret')) {
        sanitized[key] = '***redacted***';
      }
    }
    return sanitized;
  },

  detectPotentialSecret(str = '') {
    if (!str || typeof str !== 'string') return false;
    return /sk-[a-zA-Z0-9_\-]{20,}|nvapi-[a-zA-Z0-9_\-]{20,}|Bearer\s+[a-zA-Z0-9\-\._~\+\/]+=/i.test(str);
  }
};

/**
 * PolicyEngine
 * Central authorization engine replacing fragmented role checks
 */
export const PolicyEngine = {
  can({ role = 'member', action, resourceWorkspaceId, targetWorkspaceId }) {
    if (!action) return false;

    // Cross-tenant protection guard
    if (resourceWorkspaceId && targetWorkspaceId && resourceWorkspaceId !== targetWorkspaceId) {
      return false;
    }

    const permissionsByRole = {
      owner: ['*'],
      admin: ['workspace.update', 'members.invite', 'members.manage', 'tools.manage', 'settings.update', 'agent.create', 'agent.edit', 'agent.run', 'chat.message', 'workspace.export'],
      manager: ['members.invite', 'tools.manage', 'agent.create', 'agent.edit', 'agent.run', 'chat.message'],
      member: ['agent.create', 'agent.edit', 'agent.run', 'chat.message'],
      viewer: ['agent.run', 'chat.message'],
      billing_manager: ['billing.view', 'billing.update', 'addons.manage']
    };

    const allowedActions = permissionsByRole[role] || [];
    if (allowedActions.includes('*') || allowedActions.includes(action)) {
      return true;
    }

    return false;
  },

  requiresApproval(riskLevel = 1) {
    return riskLevel >= 3;
  }
};

/**
 * SecurityEventService
 * Audit logger for security events
 */
export const SecurityEventService = {
  record({ workspaceId = 'workspace_123', userId, eventType, severity = 'info', source = 'system', ipAddress = '127.0.0.1', metadata = {} }) {
    return {
      id: `sec-evt-${Date.now()}`,
      workspaceId,
      userId,
      eventType,
      severity,
      source,
      ipAddress,
      metadata: typeof metadata === 'object' ? JSON.parse(SecretRedactionService.redactText(JSON.stringify(metadata))) : {},
      createdAt: new Date().toISOString()
    };
  }
};

/**
 * AbuseDetectionService
 * Analyzes workspace risk signals and calculates risk scores
 */
export const AbuseDetectionService = {
  scoreWorkspaceUsage({ queryCountLastHour = 0, failedLogins = 0, storageBytesUsed = 0, maxStorageBytes = 100 * 1024 * 1024 }) {
    let score = 0;
    const signals = [];

    if (queryCountLastHour > 50) {
      score += 25;
      signals.push({ type: 'repetitive_web_search', score: 25, reason: 'Mais de 50 buscas web por hora.' });
    }

    if (failedLogins >= 5) {
      score += 40;
      signals.push({ type: 'brute_force_login_attempt', score: 40, reason: 'Múltiplas falhas de autenticação.' });
    }

    if (storageBytesUsed >= maxStorageBytes * 0.95) {
      score += 20;
      signals.push({ type: 'storage_capacity_abuse', score: 20, reason: 'Espaço em disco próximo do limite máximo.' });
    }

    return {
      score,
      riskLevel: score > 50 ? 'HIGH' : score > 20 ? 'MEDIUM' : 'LOW',
      signals
    };
  }
};

/**
 * IncidentService
 * Classifies security incident severities (SEV-1 to SEV-4) and manages break-glass support sessions
 */
export const IncidentService = {
  classifySeverity({ eventType, breachConfirmed = false, dataLeaked = false }) {
    if (breachConfirmed || dataLeaked || eventType === 'service_key_exposed') {
      return { severity: 'SEV1', label: 'Crítico - Vazamento ou Acesso Indevido Confirmado' };
    }
    if (eventType === 'brute_force_attack' || eventType === 'financial_abuse') {
      return { severity: 'SEV2', label: 'Alto - Tentativa Forte de Invasão ou Abuso Financeiro' };
    }
    if (eventType === 'permission_bug_contained') {
      return { severity: 'SEV3', label: 'Médio - Bug de Permissão Sem Vazamento' };
    }
    return { severity: 'SEV4', label: 'Baixo - Alerta de Segurança ou Falso Positivo' };
  },

  createBreakGlassSession({ adminUserId, workspaceId, reason }) {
    if (!reason || !reason.trim()) {
      throw new Error('Justificativa obrigatória para sessão de emergência Admin Break-Glass.');
    }

    return {
      id: `bg-session-${Date.now()}`,
      adminUserId,
      workspaceId,
      reason,
      status: 'active',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour expiry
      createdAt: new Date().toISOString()
    };
  }
};
