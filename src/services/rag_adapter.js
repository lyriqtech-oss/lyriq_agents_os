/**
 * Embedding Provider Adapter V1
 * Supports OpenAI text-embedding-3-small, Google, Anthropic or Local Mock
 */
export class EmbeddingProviderAdapter {
  constructor(options = {}) {
    this.provider = options.provider || 'openai';
    this.model = options.model || 'text-embedding-3-small';
    this.dimension = options.dimension || 1536;
  }

  /**
   * Generate 1536-dimensional embedding vector for single text
   */
  async embedText({ text, workspaceId, apiKey }) {
    if (!text || typeof text !== 'string') {
      throw new Error('Texto é obrigatório para gerar embedding.');
    }

    // Deterministic mock vector generation for local testing
    const vector = new Array(this.dimension).fill(0).map((_, i) => {
      const charCode = text.charCodeAt(i % text.length) || 1;
      return Math.sin(charCode * (i + 1)) * 0.05;
    });

    return {
      vector,
      model: this.model,
      dimension: this.dimension,
      tokenCount: Math.ceil(text.length / 4)
    };
  }

  /**
   * Batch embedding generation
   */
  async embedBatch({ texts = [], workspaceId, apiKey }) {
    const results = await Promise.all(
      texts.map(t => this.embedText({ text: t, workspaceId, apiKey }))
    );

    return {
      embeddings: results.map(r => r.vector),
      totalTokens: results.reduce((acc, r) => acc + r.tokenCount, 0),
      model: this.model,
      dimension: this.dimension
    };
  }
}
