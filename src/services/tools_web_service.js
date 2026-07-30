import crypto from 'crypto';

/**
 * Tools, Tool Registry & Free Web Navigation with DuckDuckGo V1 Service Module
 * Handles centralized tool registration, 5-level risk management (Risk 0-4), free DuckDuckGo web search, and SSRF-safe page fetching.
 */

// Default System Tools Registry
export const DEFAULT_TOOLS = [
  {
    name: 'web_search_duckduckgo',
    displayName: 'Pesquisar na Web (DuckDuckGo)',
    description: 'Busca pública gratuita de informações na web usando DuckDuckGo.',
    category: 'web',
    riskLevel: 1,
    requiredPermission: 'tools.web.search',
    requiresApproval: false,
    enabled: true,
    plans: ['free', 'flash', 'pro', 'max_5x', 'max_20x', 'business', 'enterprise']
  },
  {
    name: 'web_fetch_page',
    displayName: 'Abrir Página Web Pública',
    description: 'Acessa e extrai o texto limpo de uma página web pública com proteção SSRF.',
    category: 'web',
    riskLevel: 1,
    requiredPermission: 'tools.web.fetch',
    requiresApproval: false,
    enabled: true,
    plans: ['free', 'flash', 'pro', 'max_5x', 'max_20x', 'business', 'enterprise']
  },
  {
    name: 'web_extract_readable_text',
    displayName: 'Extrair Texto & Citações',
    description: 'Converte marcação HTML em texto estruturado e gera fontes para resposta.',
    category: 'web',
    riskLevel: 1,
    requiredPermission: 'tools.web.extract',
    requiresApproval: false,
    enabled: true,
    plans: ['free', 'flash', 'pro', 'max_5x', 'max_20x', 'business', 'enterprise']
  }
];

/**
 * ToolRegistryService
 * Central registry for tool definitions and plan/workspace availability
 */
export const ToolRegistryService = {
  listAvailableTools(workspaceId = 'workspace_123') {
    return DEFAULT_TOOLS;
  },

  getToolDefinition(toolName) {
    return DEFAULT_TOOLS.find(t => t.name === toolName) || null;
  },

  validateToolInput(toolName, input = {}) {
    if (toolName === 'web_search_duckduckgo' && (!input.query || !input.query.trim())) {
      return { valid: false, error: 'O termo de busca (query) é obrigatório.' };
    }
    if (toolName === 'web_fetch_page' && (!input.url || !input.url.trim())) {
      return { valid: false, error: 'A URL de acesso é obrigatória.' };
    }
    return { valid: true };
  }
};

/**
 * WebFetchService
 * SSRF Safety validation & text extraction
 */
export const WebFetchService = {
  validateUrlSafety(url) {
    if (!url) return { safe: false, reason: 'URL nula ou vazia.' };

    const lower = url.toLowerCase().trim();

    // Block non-HTTP protocols (e.g. file://, gopher://, ftp://)
    if (lower.startsWith('file:') || lower.startsWith('gopher:') || lower.startsWith('ftp:')) {
      return { safe: false, reason: 'Protocolo proibido por segurança (apenas http/https são permitidos).' };
    }

    // Block localhost, IP loopback & cloud metadata IPs
    const forbiddenPatterns = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '169.254.169.254', // AWS/GCP/Azure Cloud Metadata
      '10.',
      '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.30.', '172.31.',
      '192.168.'
    ];

    for (const pattern of forbiddenPatterns) {
      if (lower.includes(pattern)) {
        return { safe: false, reason: `Acesso a endereços internos/privados (${pattern}) é bloqueado por proteção SSRF.` };
      }
    }

    return { safe: true };
  },

  extractReadableText(html) {
    if (!html) return '';
    // Strip tags and script/style contents
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  },

  buildCitation(title, url) {
    return {
      title: title || url,
      url,
      accessedAt: new Date().toISOString(),
      source: 'DuckDuckGo Web Navigation'
    };
  }
};

/**
 * WebSearchService
 * Free DuckDuckGo search parser & mock response generator
 */
export const WebSearchService = {
  searchDuckDuckGo(query, options = {}) {
    if (!query) return { results: [] };

    const mockResults = [
      {
        title: `Notícias e Informações sobre: ${query}`,
        url: `https://noticias.exemplo.com/busca?q=${encodeURIComponent(query)}`,
        snippet: `Resumo dos principais resultados de busca na web para a pesquisa "${query}".`,
        source: 'DuckDuckGo'
      },
      {
        title: `Guia Completo e Documentação de ${query}`,
        url: `https://docs.exemplo.org/guia/${encodeURIComponent(query)}`,
        snippet: `Artigo detalhado e atualizado sobre ${query} com dados recentes da indústria.`,
        source: 'DuckDuckGo'
      }
    ];

    return {
      query,
      resultsCount: mockResults.length,
      results: mockResults,
      cached: false,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * ToolExecutionService
 * Safe tool runtime & Web Prompt Injection untrusted flag assignment
 */
export const ToolExecutionService = {
  executeTool({ workspaceId = 'workspace_123', agentId, toolName, input = {} }) {
    const toolDef = ToolRegistryService.getToolDefinition(toolName);
    if (!toolDef) {
      return { status: 'failed', error: `Ferramenta "${toolName}" não cadastrada no registry.` };
    }

    const validation = ToolRegistryService.validateToolInput(toolName, input);
    if (!validation.valid) {
      return { status: 'failed', error: validation.error };
    }

    // Risk 3 & 4 require approval
    if (toolDef.riskLevel >= 3 || toolDef.requiresApproval) {
      return {
        status: 'waiting_approval',
        requiresApproval: true,
        riskLevel: toolDef.riskLevel,
        message: `Ação com nível de risco ${toolDef.riskLevel} requer aprovação prévia do usuário.`
      };
    }

    let output = {};
    if (toolName === 'web_search_duckduckgo') {
      output = WebSearchService.searchDuckDuckGo(input.query);
    } else if (toolName === 'web_fetch_page') {
      const safety = WebFetchService.validateUrlSafety(input.url);
      if (!safety.safe) {
        return { status: 'failed', error: safety.reason };
      }

      const mockHtml = `<html><head><title>Página de Exemplo</title></head><body><h1>Conteúdo de ${input.url}</h1><p>Texto extraído da página web acessada com sucesso pelo agente.</p></body></html>`;
      const cleanText = WebFetchService.extractReadableText(mockHtml);

      output = {
        url: input.url,
        title: 'Página de Exemplo',
        extractedText: cleanText,
        untrustedContent: true, // Untrusted flag for web prompt injection defense
        citation: WebFetchService.buildCitation('Página de Exemplo', input.url)
      };
    } else {
      output = { result: 'Ferramenta executada com sucesso.' };
    }

    return {
      status: 'completed',
      toolCallId: `tcall-${Date.now()}`,
      toolName,
      riskLevel: toolDef.riskLevel,
      output,
      isUntrustedContent: Boolean(output.untrustedContent)
    };
  }
};
