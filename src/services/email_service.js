import crypto from 'crypto';

/**
 * Normalize Email Subject for threading comparison
 * Strips Re:, Fwd:, Enc:, RES:, FW:, trims and lowercases
 */
export function normalizeSubject(subject) {
  if (!subject || typeof subject !== 'string') return '';
  let cleaned = subject.trim();

  // Iteratively strip prefixes case-insensitively
  const prefixRegex = /^(re|fwd|fw|enc|res|resposta|encaminhado):\s*/i;
  while (prefixRegex.test(cleaned)) {
    cleaned = cleaned.replace(prefixRegex, '').trim();
  }

  return cleaned.toLowerCase();
}

/**
 * Classify Email Category, Priority, Intention and Risk Level
 */
export function classifyEmail({ subject, bodyText, fromEmail, headers = {} }) {
  const text = `${subject || ''} ${bodyText || ''}`.toLowerCase();

  let category = 'other';
  let priority = 'normal';
  let riskLevel = 'safe';

  // Category & Keyword Detection
  if (text.includes('suporte') || text.includes('ajuda') || text.includes('bug') || text.includes('erro') || text.includes('problema')) {
    category = 'support';
  } else if (text.includes('orçamento') || text.includes('proposta') || text.includes('preço') || text.includes('comprar') || text.includes('vendas') || text.includes('plano')) {
    category = 'sales';
  } else if (text.includes('fatura') || text.includes('pagamento') || text.includes('nota fiscal') || text.includes('cobrança') || text.includes('pix') || text.includes('boleto')) {
    category = 'billing';
  } else if (text.includes('jurídico') || text.includes('processo') || text.includes('advogado') || text.includes('notificação extrajudicial')) {
    category = 'legal_risk';
    priority = 'urgent';
    riskLevel = 'critical';
  } else if (text.includes('cancelamento') || text.includes('cancelar') || text.includes('reembolso') || text.includes('estorno')) {
    category = 'complaint';
    priority = 'high';
    riskLevel = 'sensitive';
  } else if (text.includes('parceria') || text.includes('partnership')) {
    category = 'partnership';
  }

  // Priority adjustments
  if (text.includes('urgente') || text.includes('imediatamente') || text.includes('asap')) {
    priority = 'urgent';
  }

  // Sensitive Risk Detection
  if (text.includes('desconto') || text.includes('proposta formal') || text.includes('alterar dados')) {
    riskLevel = 'sensitive';
  }

  return {
    category,
    priority,
    riskLevel,
    requiresApproval: riskLevel === 'sensitive' || riskLevel === 'critical',
    requiresHumanHandoff: riskLevel === 'critical'
  };
}

/**
 * Anti-loop Email Protection Guard
 * Rejects mailer-daemon, bounces, no-reply authors, Auto-Submitted & Precedence bulk headers
 */
export function isAntiLoopHeader({ fromEmail, headers = {} }) {
  if (!fromEmail || typeof fromEmail !== 'string') return true;
  const lowerFrom = fromEmail.toLowerCase();

  // No-reply or Daemon addresses
  if (lowerFrom.includes('no-reply') || lowerFrom.includes('noreply') || lowerFrom.includes('mailer-daemon') || lowerFrom.includes('postmaster')) {
    return true;
  }

  // Header checks
  const autoSubmitted = (headers['auto-submitted'] || headers['Auto-Submitted'] || '').toLowerCase();
  if (autoSubmitted && autoSubmitted !== 'no') {
    return true;
  }

  const precedence = (headers['precedence'] || headers['Precedence'] || '').toLowerCase();
  if (precedence === 'bulk' || precedence === 'junk' || precedence === 'list') {
    return true;
  }

  const unsubscribe = headers['list-unsubscribe'] || headers['List-Unsubscribe'];
  if (unsubscribe) {
    return true;
  }

  return false;
}

/**
 * Validate Attachment Security & MIME Types
 * Blocks dangerous executable files (.exe, .bat, .sh, .js, .jar, .scr, .msi)
 */
export function isDangerousAttachment(filename, mimeType = '') {
  if (!filename) return false;
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  const dangerousExtensions = ['exe', 'bat', 'cmd', 'sh', 'js', 'jar', 'scr', 'msi', 'vbs', 'com', 'pif'];
  const dangerousMimeTypes = ['application/x-msdownload', 'application/x-executable', 'application/x-sh', 'application/javascript'];

  if (dangerousExtensions.includes(ext)) return true;
  if (dangerousMimeTypes.includes(mimeType.toLowerCase())) return true;

  return false;
}

/**
 * HTML Body Sanitizer - Strips <script> tags and malicious event handlers
 */
export function sanitizeHtmlBody(rawHtml) {
  if (!rawHtml || typeof rawHtml !== 'string') return '';
  return rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');
}

/**
 * Generate Idempotency Key for Email Messages
 */
export function generateEmailIdempotencyKey(connectionId, providerMessageId) {
  const str = `${connectionId}:${providerMessageId}`;
  return crypto.createHash('sha256').update(str).digest('hex');
}
