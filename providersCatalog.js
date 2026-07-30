// ============================================================================
// ANTIGRAVITY FIX V3 - Catálogo Real de Modelos por Provider & Live Adapters
// Revision Date: 2026-07-30
// ============================================================================

const FALLBACK_CATALOG = {
  openai: [
    {
      provider: 'openai',
      id: 'gpt-5.6',
      displayName: 'GPT-5.6 Flagship',
      family: 'GPT-5',
      version: '5.6',
      status: 'current',
      modalities: ['text', 'image_input', 'image_output', 'audio_input', 'audio_output'],
      capabilities: ['chat', 'reasoning', 'tool_calling', 'json_mode', 'vision', 'code'],
      contextWindow: 200000,
      maxOutputTokens: 16384,
      supportsStreaming: true,
      supportsTools: true,
      supportsJsonMode: true,
      supportsVision: true,
      inputPricePer1M: 5.00,
      outputPricePer1M: 15.00,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'pro'
    },
    {
      provider: 'openai',
      id: 'gpt-5.6-sol',
      displayName: 'GPT-5.6 Sol',
      family: 'GPT-5',
      version: '5.6-sol',
      status: 'current',
      modalities: ['text', 'image_input'],
      capabilities: ['chat', 'reasoning', 'tool_calling', 'code'],
      contextWindow: 200000,
      maxOutputTokens: 16384,
      supportsStreaming: true,
      supportsTools: true,
      supportsJsonMode: true,
      supportsVision: true,
      inputPricePer1M: 5.00,
      outputPricePer1M: 15.00,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'pro'
    },
    {
      provider: 'openai',
      id: 'gpt-5.6-terra',
      displayName: 'GPT-5.6 Terra',
      family: 'GPT-5',
      version: '5.6-terra',
      status: 'stable',
      modalities: ['text'],
      capabilities: ['chat', 'tool_calling', 'json_mode'],
      contextWindow: 128000,
      maxOutputTokens: 8192,
      supportsStreaming: true,
      supportsTools: true,
      supportsJsonMode: true,
      supportsVision: false,
      inputPricePer1M: 2.50,
      outputPricePer1M: 7.50,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'pro'
    },
    {
      provider: 'openai',
      id: 'gpt-5.6-luna',
      displayName: 'GPT-5.6 Luna',
      family: 'GPT-5',
      version: '5.6-luna',
      status: 'stable',
      modalities: ['text'],
      capabilities: ['chat', 'tool_calling'],
      contextWindow: 128000,
      maxOutputTokens: 8192,
      supportsStreaming: true,
      supportsTools: true,
      supportsJsonMode: true,
      supportsVision: false,
      inputPricePer1M: 1.00,
      outputPricePer1M: 3.00,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'free'
    },
    {
      provider: 'openai',
      id: 'gpt-5.5',
      displayName: 'GPT-5.5 Standard',
      family: 'GPT-5',
      version: '5.5',
      status: 'stable',
      modalities: ['text', 'image_input'],
      capabilities: ['chat', 'reasoning', 'tool_calling', 'vision'],
      contextWindow: 128000,
      maxOutputTokens: 8192,
      supportsStreaming: true,
      supportsTools: true,
      supportsJsonMode: true,
      supportsVision: true,
      inputPricePer1M: 3.00,
      outputPricePer1M: 10.00,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'pro'
    },
    {
      provider: 'openai',
      id: 'gpt-5.5-pro',
      displayName: 'GPT-5.5 Pro High-Capacity',
      family: 'GPT-5',
      version: '5.5-pro',
      status: 'stable',
      modalities: ['text', 'image_input'],
      capabilities: ['chat', 'reasoning', 'tool_calling', 'vision', 'code'],
      contextWindow: 200000,
      maxOutputTokens: 16384,
      supportsStreaming: true,
      supportsTools: true,
      supportsJsonMode: true,
      supportsVision: true,
      inputPricePer1M: 6.00,
      outputPricePer1M: 18.00,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'max'
    },
    {
      provider: 'openai',
      id: 'gpt-4o',
      displayName: 'GPT-4o Omnimodal',
      family: 'GPT-4',
      version: '4o',
      status: 'stable',
      modalities: ['text', 'image_input'],
      capabilities: ['chat', 'vision', 'tool_calling', 'json_mode', 'code'],
      contextWindow: 128000,
      maxOutputTokens: 4096,
      supportsStreaming: true,
      supportsTools: true,
      supportsJsonMode: true,
      supportsVision: true,
      inputPricePer1M: 2.50,
      outputPricePer1M: 10.00,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'free'
    },
    {
      provider: 'openai',
      id: 'gpt-4o-mini',
      displayName: 'GPT-4o Mini Fast',
      family: 'GPT-4',
      version: '4o-mini',
      status: 'stable',
      modalities: ['text', 'image_input'],
      capabilities: ['chat', 'tool_calling', 'json_mode'],
      contextWindow: 128000,
      maxOutputTokens: 4096,
      supportsStreaming: true,
      supportsTools: true,
      supportsJsonMode: true,
      supportsVision: true,
      inputPricePer1M: 0.15,
      outputPricePer1M: 0.60,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'free'
    },
    {
      provider: 'openai',
      id: 'o3',
      displayName: 'OpenAI o3 Deep Reasoning',
      family: 'o-series',
      version: '3.0',
      status: 'stable',
      modalities: ['text'],
      capabilities: ['reasoning', 'chat', 'code'],
      contextWindow: 200000,
      maxOutputTokens: 65536,
      supportsStreaming: true,
      supportsTools: true,
      supportsJsonMode: true,
      supportsVision: false,
      inputPricePer1M: 15.00,
      outputPricePer1M: 60.00,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'max'
    }
  ],

  gemini: [
    {
      provider: 'gemini',
      id: 'gemini-3.6-flash',
      displayName: 'Gemini 3.6 Flash Flagship',
      family: 'Gemini 3.6',
      version: '3.6',
      status: 'current',
      modalities: ['text', 'image_input', 'audio_input', 'video_input'],
      capabilities: ['chat', 'reasoning', 'tool_calling', 'json_mode', 'vision', 'code'],
      contextWindow: 2000000,
      maxOutputTokens: 16384,
      supportsStreaming: true,
      supportsTools: true,
      supportsJsonMode: true,
      supportsVision: true,
      inputPricePer1M: 0.15,
      outputPricePer1M: 0.60,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'pro'
    },
    {
      provider: 'gemini',
      id: 'gemini-3.5-flash',
      displayName: 'Gemini 3.5 Flash',
      family: 'Gemini 3.5',
      version: '3.5',
      status: 'current',
      modalities: ['text', 'image_input', 'audio_input'],
      capabilities: ['chat', 'tool_calling', 'json_mode', 'vision', 'code'],
      contextWindow: 1000000,
      maxOutputTokens: 8192,
      supportsStreaming: true,
      supportsTools: true,
      supportsJsonMode: true,
      supportsVision: true,
      inputPricePer1M: 0.10,
      outputPricePer1M: 0.40,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'free'
    },
    {
      provider: 'gemini',
      id: 'gemini-3.5-flash-lite',
      displayName: 'Gemini 3.5 Flash-Lite',
      family: 'Gemini 3.5',
      version: '3.5',
      status: 'stable',
      modalities: ['text'],
      capabilities: ['chat', 'tool_calling'],
      contextWindow: 1000000,
      maxOutputTokens: 4096,
      supportsStreaming: true,
      supportsTools: true,
      supportsJsonMode: true,
      supportsVision: false,
      inputPricePer1M: 0.05,
      outputPricePer1M: 0.20,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'free'
    },
    {
      provider: 'gemini',
      id: 'gemini-3.1-flash-lite',
      displayName: 'Gemini 3.1 Flash-Lite',
      family: 'Gemini 3.1',
      version: '3.1',
      status: 'stable',
      modalities: ['text'],
      capabilities: ['chat', 'tool_calling'],
      contextWindow: 1000000,
      maxOutputTokens: 4096,
      supportsStreaming: true,
      supportsTools: true,
      supportsJsonMode: true,
      supportsVision: false,
      inputPricePer1M: 0.04,
      outputPricePer1M: 0.16,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'free'
    },
    {
      provider: 'gemini',
      id: 'gemini-3-flash-preview',
      displayName: 'Gemini 3 Flash (Preview)',
      family: 'Gemini 3',
      version: '3.0',
      status: 'preview',
      modalities: ['text', 'image_input'],
      capabilities: ['chat', 'reasoning', 'vision'],
      contextWindow: 1000000,
      maxOutputTokens: 8192,
      supportsStreaming: true,
      supportsTools: true,
      supportsJsonMode: true,
      supportsVision: true,
      inputPricePer1M: 0.10,
      outputPricePer1M: 0.40,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'pro'
    },
    {
      provider: 'gemini',
      id: 'gemini-2.5-pro',
      displayName: 'Gemini 2.5 Pro Multimodal',
      family: 'Gemini 2.5',
      version: '2.5',
      status: 'stable',
      modalities: ['text', 'image_input', 'audio_input', 'video_input'],
      capabilities: ['chat', 'reasoning', 'tool_calling', 'json_mode', 'vision', 'code'],
      contextWindow: 2000000,
      maxOutputTokens: 8192,
      supportsStreaming: true,
      supportsTools: true,
      supportsJsonMode: true,
      supportsVision: true,
      inputPricePer1M: 1.25,
      outputPricePer1M: 5.00,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'pro'
    },
    {
      provider: 'gemini',
      id: 'gemini-2.5-flash',
      displayName: 'Gemini 2.5 Flash Ultra-Fast',
      family: 'Gemini 2.5',
      version: '2.5',
      status: 'stable',
      modalities: ['text', 'image_input', 'audio_input'],
      capabilities: ['chat', 'tool_calling', 'json_mode', 'vision', 'code'],
      contextWindow: 1000000,
      maxOutputTokens: 8192,
      supportsStreaming: true,
      supportsTools: true,
      supportsJsonMode: true,
      supportsVision: true,
      inputPricePer1M: 0.075,
      outputPricePer1M: 0.30,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'free'
    },
    {
      provider: 'gemini',
      id: 'gemini-3.1-flash-image',
      displayName: 'Gemini 3.1 Flash Image Generator',
      family: 'Gemini Image',
      version: '3.1',
      status: 'current',
      modalities: ['text', 'image_output'],
      capabilities: ['image_generation'],
      contextWindow: 32000,
      maxOutputTokens: 4096,
      supportsStreaming: false,
      supportsTools: false,
      supportsJsonMode: false,
      supportsVision: false,
      inputPricePer1M: 0.50,
      outputPricePer1M: 2.00,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'pro'
    },
    {
      provider: 'gemini',
      id: 'veo-3-generate',
      displayName: 'Veo 3 Video Generator',
      family: 'Veo Video',
      version: '3.0',
      status: 'current',
      modalities: ['text', 'video_output'],
      capabilities: ['video'],
      contextWindow: 16000,
      maxOutputTokens: 4096,
      supportsStreaming: false,
      supportsTools: false,
      supportsJsonMode: false,
      supportsVision: false,
      inputPricePer1M: 5.00,
      outputPricePer1M: 20.00,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'max'
    },
    {
      provider: 'gemini',
      id: 'lyria-3-pro-preview',
      displayName: 'Lyria 3 Pro Music Synthesizer',
      family: 'Lyria Music',
      version: '3.0',
      status: 'preview',
      modalities: ['text', 'audio_output'],
      capabilities: ['music', 'audio'],
      contextWindow: 16000,
      maxOutputTokens: 4096,
      supportsStreaming: false,
      supportsTools: false,
      supportsJsonMode: false,
      supportsVision: false,
      inputPricePer1M: 3.00,
      outputPricePer1M: 12.00,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'max'
    },
    {
      provider: 'gemini',
      id: 'gemma-4',
      displayName: 'Gemma 4 Open Model',
      family: 'Gemma',
      version: '4.0',
      status: 'current',
      modalities: ['text'],
      capabilities: ['chat', 'code'],
      contextWindow: 128000,
      maxOutputTokens: 8192,
      supportsStreaming: true,
      supportsTools: true,
      supportsJsonMode: true,
      supportsVision: false,
      inputPricePer1M: 0.10,
      outputPricePer1M: 0.20,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'free'
    }
  ],

  anthropic: [
    {
      provider: 'anthropic',
      id: 'claude-fable-5',
      displayName: 'Claude 5 Fable (Preview)',
      family: 'Claude 5',
      version: '5.0',
      status: 'preview',
      modalities: ['text', 'image_input'],
      capabilities: ['chat', 'reasoning', 'tool_calling', 'vision', 'code'],
      contextWindow: 200000,
      maxOutputTokens: 16384,
      supportsStreaming: true,
      supportsTools: true,
      supportsJsonMode: true,
      supportsVision: true,
      inputPricePer1M: 4.00,
      outputPricePer1M: 12.00,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'max'
    },
    {
      provider: 'anthropic',
      id: 'claude-opus-5',
      displayName: 'Claude 5 Opus Flagship',
      family: 'Claude 5',
      version: '5.0',
      status: 'current',
      modalities: ['text', 'image_input'],
      capabilities: ['chat', 'reasoning', 'tool_calling', 'vision', 'code'],
      contextWindow: 200000,
      maxOutputTokens: 16384,
      supportsStreaming: true,
      supportsTools: true,
      supportsJsonMode: true,
      supportsVision: true,
      inputPricePer1M: 15.00,
      outputPricePer1M: 75.00,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'max'
    },
    {
      provider: 'anthropic',
      id: 'claude-sonnet-5',
      displayName: 'Claude 5 Sonnet Balanced',
      family: 'Claude 5',
      version: '5.0',
      status: 'current',
      modalities: ['text', 'image_input'],
      capabilities: ['chat', 'reasoning', 'tool_calling', 'vision', 'code'],
      contextWindow: 200000,
      maxOutputTokens: 8192,
      supportsStreaming: true,
      supportsTools: true,
      supportsJsonMode: true,
      supportsVision: true,
      inputPricePer1M: 3.00,
      outputPricePer1M: 15.00,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'pro'
    },
    {
      provider: 'anthropic',
      id: 'claude-haiku-4-5-20251001',
      displayName: 'Claude 4.5 Haiku Fast',
      family: 'Claude 4.5',
      version: '4.5',
      status: 'current',
      modalities: ['text'],
      capabilities: ['chat', 'tool_calling', 'json_mode'],
      contextWindow: 200000,
      maxOutputTokens: 4096,
      supportsStreaming: true,
      supportsTools: true,
      supportsJsonMode: true,
      supportsVision: false,
      inputPricePer1M: 0.80,
      outputPricePer1M: 4.00,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'free'
    },
    {
      provider: 'anthropic',
      id: 'claude-sonnet-4-6',
      displayName: 'Claude 4.6 Sonnet',
      family: 'Claude 4',
      version: '4.6',
      status: 'stable',
      modalities: ['text', 'image_input'],
      capabilities: ['chat', 'tool_calling', 'vision'],
      contextWindow: 200000,
      maxOutputTokens: 8192,
      supportsStreaming: true,
      supportsTools: true,
      supportsJsonMode: true,
      supportsVision: true,
      inputPricePer1M: 3.00,
      outputPricePer1M: 15.00,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'free'
    }
  ],

  mistral: [
    {
      provider: 'mistral',
      id: 'labs-leanstral-2603',
      displayName: 'Leanstral 26.03',
      family: 'Leanstral',
      version: '26.03',
      status: 'current',
      modalities: ['text'],
      capabilities: ['chat', 'code', 'tool_calling'],
      contextWindow: 128000,
      maxOutputTokens: 8192,
      supportsStreaming: true,
      supportsTools: true,
      supportsJsonMode: true,
      supportsVision: false,
      inputPricePer1M: 0.20,
      outputPricePer1M: 0.60,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'free'
    },
    {
      provider: 'mistral',
      id: 'mistral-medium-2508',
      displayName: 'Mistral Medium 3.1',
      family: 'Mistral Medium',
      version: '3.1',
      status: 'current',
      modalities: ['text'],
      capabilities: ['chat', 'reasoning', 'tool_calling'],
      contextWindow: 128000,
      maxOutputTokens: 8192,
      supportsStreaming: true,
      supportsTools: true,
      supportsJsonMode: true,
      supportsVision: false,
      inputPricePer1M: 2.70,
      outputPricePer1M: 8.10,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'pro'
    },
    {
      provider: 'mistral',
      id: 'mistral-small-2506',
      displayName: 'Mistral Small 3.2',
      family: 'Mistral Small',
      version: '3.2',
      status: 'current',
      modalities: ['text'],
      capabilities: ['chat', 'tool_calling'],
      contextWindow: 32000,
      maxOutputTokens: 4096,
      supportsStreaming: true,
      supportsTools: true,
      supportsJsonMode: true,
      supportsVision: false,
      inputPricePer1M: 0.20,
      outputPricePer1M: 0.60,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'free'
    },
    {
      provider: 'mistral',
      id: 'mistral-ocr-2505',
      displayName: 'Mistral OCR 2',
      family: 'Mistral OCR',
      version: '2.0',
      status: 'current',
      modalities: ['image_input', 'text'],
      capabilities: ['vision'],
      contextWindow: 64000,
      maxOutputTokens: 4096,
      supportsStreaming: false,
      supportsTools: false,
      supportsJsonMode: true,
      supportsVision: true,
      inputPricePer1M: 1.00,
      outputPricePer1M: 3.00,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'pro'
    }
  ],

  groq: [
    {
      provider: 'groq',
      id: 'llama-3.3-70b-versatile',
      displayName: 'Llama 3.3 70B Versatile (Groq)',
      family: 'Llama 3.3',
      version: '3.3',
      status: 'current',
      modalities: ['text'],
      capabilities: ['chat', 'tool_calling', 'code'],
      contextWindow: 128000,
      maxOutputTokens: 8192,
      supportsStreaming: true,
      supportsTools: true,
      supportsJsonMode: true,
      supportsVision: false,
      inputPricePer1M: 0.59,
      outputPricePer1M: 0.79,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'free'
    },
    {
      provider: 'groq',
      id: 'llama-3.1-8b-instant',
      displayName: 'Llama 3.1 8B Instant (Groq)',
      family: 'Llama 3.1',
      version: '3.1',
      status: 'current',
      modalities: ['text'],
      capabilities: ['chat', 'tool_calling'],
      contextWindow: 128000,
      maxOutputTokens: 8192,
      supportsStreaming: true,
      supportsTools: true,
      supportsJsonMode: true,
      supportsVision: false,
      inputPricePer1M: 0.05,
      outputPricePer1M: 0.08,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'free'
    },
    {
      provider: 'groq',
      id: 'whisper-large-v3',
      displayName: 'Whisper Large v3 (Groq STT)',
      family: 'Whisper',
      version: 'v3',
      status: 'current',
      modalities: ['audio_input', 'text'],
      capabilities: ['audio'],
      contextWindow: 16000,
      maxOutputTokens: 4096,
      supportsStreaming: false,
      supportsTools: false,
      supportsJsonMode: false,
      supportsVision: false,
      inputPricePer1M: 0.10,
      outputPricePer1M: 0.10,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'free'
    },
    {
      provider: 'groq',
      id: 'groq/compound',
      displayName: 'Groq Compound System',
      family: 'Groq System',
      version: '1.0',
      status: 'current',
      modalities: ['text'],
      capabilities: ['chat', 'reasoning', 'search'],
      contextWindow: 128000,
      maxOutputTokens: 8192,
      supportsStreaming: true,
      supportsTools: true,
      supportsJsonMode: true,
      supportsVision: false,
      inputPricePer1M: 1.00,
      outputPricePer1M: 3.00,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'pro'
    }
  ],

  deepseek: [
    {
      provider: 'deepseek',
      id: 'deepseek-v4-flash',
      displayName: 'DeepSeek V4 Flash',
      family: 'DeepSeek V4',
      version: '4.0',
      status: 'current',
      modalities: ['text'],
      capabilities: ['chat', 'reasoning', 'tool_calling', 'code'],
      contextWindow: 128000,
      maxOutputTokens: 8192,
      supportsStreaming: true,
      supportsTools: true,
      supportsJsonMode: true,
      supportsVision: false,
      inputPricePer1M: 0.14,
      outputPricePer1M: 0.28,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'free'
    },
    {
      provider: 'deepseek',
      id: 'deepseek-v4-pro',
      displayName: 'DeepSeek V4 Pro High-Reasoner',
      family: 'DeepSeek V4',
      version: '4.0',
      status: 'current',
      modalities: ['text'],
      capabilities: ['chat', 'reasoning', 'tool_calling', 'code'],
      contextWindow: 128000,
      maxOutputTokens: 16384,
      supportsStreaming: true,
      supportsTools: true,
      supportsJsonMode: true,
      supportsVision: false,
      inputPricePer1M: 0.55,
      outputPricePer1M: 2.19,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'pro'
    }
  ],

  openrouter: [
    {
      provider: 'openrouter',
      id: 'openai/gpt-4o',
      displayName: 'OpenAI GPT-4o (via OpenRouter)',
      family: 'OpenAI',
      version: '4o',
      status: 'stable',
      modalities: ['text', 'image_input'],
      capabilities: ['chat', 'vision', 'tool_calling'],
      contextWindow: 128000,
      maxOutputTokens: 4096,
      supportsStreaming: true,
      supportsTools: true,
      supportsJsonMode: true,
      supportsVision: true,
      inputPricePer1M: 2.50,
      outputPricePer1M: 10.00,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'free'
    },
    {
      provider: 'openrouter',
      id: 'anthropic/claude-3.5-sonnet',
      displayName: 'Claude 3.5 Sonnet (via OpenRouter)',
      family: 'Anthropic',
      version: '3.5',
      status: 'stable',
      modalities: ['text', 'image_input'],
      capabilities: ['chat', 'vision', 'tool_calling'],
      contextWindow: 200000,
      maxOutputTokens: 8192,
      supportsStreaming: true,
      supportsTools: true,
      supportsJsonMode: true,
      supportsVision: true,
      inputPricePer1M: 3.00,
      outputPricePer1M: 15.00,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'free'
    }
  ],

  ollama: [
    {
      provider: 'ollama',
      id: 'llama3.3',
      displayName: 'Llama 3.3 (Ollama Local)',
      family: 'Llama',
      version: '3.3',
      status: 'current',
      modalities: ['text'],
      capabilities: ['chat', 'code', 'tool_calling'],
      contextWindow: 128000,
      maxOutputTokens: 8192,
      supportsStreaming: true,
      supportsTools: true,
      supportsJsonMode: true,
      supportsVision: false,
      inputPricePer1M: 0,
      outputPricePer1M: 0,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'free'
    },
    {
      provider: 'ollama',
      id: 'deepseek-r1',
      displayName: 'DeepSeek R1 Local Reasoning',
      family: 'DeepSeek',
      version: 'R1',
      status: 'current',
      modalities: ['text'],
      capabilities: ['chat', 'reasoning', 'code'],
      contextWindow: 64000,
      maxOutputTokens: 8192,
      supportsStreaming: true,
      supportsTools: false,
      supportsJsonMode: true,
      supportsVision: false,
      inputPricePer1M: 0,
      outputPricePer1M: 0,
      currency: 'USD',
      source: 'fallback_catalog',
      isAvailable: true,
      requiresPlan: 'free'
    }
  ]
};

// Plan weights
const PLAN_WEIGHTS = { free: 1, flash: 2, pro: 3, max: 4, max_5x: 4, max_20x: 5, business: 6, enterprise: 7 };

/**
 * Backend Plan Gating Function
 */
function canUseModel({ workspaceId, userId, provider, modelId, plan = 'free' }) {
  const provList = FALLBACK_CATALOG[provider] || [];
  const modelObj = provList.find(m => m.id === modelId);

  if (!modelObj) {
    return { allowed: true };
  }

  const reqPlan = modelObj.requiresPlan || 'free';
  const userWeight = PLAN_WEIGHTS[plan.toLowerCase()] || 1;
  const reqWeight = PLAN_WEIGHTS[reqPlan] || 1;

  if (userWeight < reqWeight) {
    return {
      allowed: false,
      reason: `O modelo "${modelObj.displayName || modelId}" requer o plano ${reqPlan.toUpperCase()}. O workspace atual está no plano ${plan.toUpperCase()}.`
    };
  }

  return { allowed: true };
}

/**
 * Dynamic API Fetcher Adapter with Fallback Catalog (Fix V3 Spec 4)
 */
async function getModelsForProvider(provider, apiKey = '') {
  // If API Key is present or for public endpoints (OpenRouter/Ollama/Groq), try fetching live list
  try {
    let fetchUrl = '';
    let headers = { 'Content-Type': 'application/json' };

    if (provider === 'openai' && apiKey) {
      fetchUrl = 'https://api.openai.com/v1/models';
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (provider === 'groq') {
      fetchUrl = 'https://api.groq.com/openai/v1/models';
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (provider === 'openrouter') {
      fetchUrl = 'https://openrouter.ai/api/v1/models';
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (provider === 'mistral' && apiKey) {
      fetchUrl = 'https://api.mistral.ai/v1/models';
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (provider === 'gemini' && apiKey) {
      fetchUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    } else if (provider === 'ollama') {
      fetchUrl = 'http://localhost:11434/api/tags';
    }

    if (fetchUrl) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(fetchUrl, { headers, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok && apiKey && [401, 403].includes(response.status)) {
        throw new Error(`PROVIDER_AUTH_FAILED:${provider}`);
      }

      if (response.ok) {
        const data = await response.json();
        let rawList = data.data || data.models || data.models_list || [];
        if (data.models && Array.isArray(data.models)) rawList = data.models;

        if (Array.isArray(rawList) && rawList.length > 0) {
          const keyAvailableIds = new Set(rawList.map(item => item.id || item.name || String(item)));
          const fallbackList = FALLBACK_CATALOG[provider] || [];

          // Normalize API models
          const apiModels = rawList.slice(0, 40).map(item => {
            const id = item.id || item.name || String(item);
            const known = fallbackList.find(f => f.id === id);

            return {
              provider,
              id,
              displayName: known ? known.displayName : (item.name || id),
              family: known ? known.family : provider.toUpperCase(),
              version: known ? known.version : 'API',
              status: known ? known.status : 'current',
              modalities: known ? known.modalities : (item.context_length > 100000 ? ['text', 'image_input'] : ['text']),
              capabilities: known ? known.capabilities : ['chat', 'tool_calling'],
              contextWindow: known ? known.contextWindow : (item.context_length || 128000),
              maxOutputTokens: known ? known.maxOutputTokens : 4096,
              supportsStreaming: true,
              supportsTools: true,
              supportsJsonMode: true,
              supportsVision: known ? known.supportsVision : false,
              inputPricePer1M: known ? known.inputPricePer1M : (item.pricing?.prompt ? parseFloat(item.pricing.prompt) * 1000000 : 0.5),
              outputPricePer1M: known ? known.outputPricePer1M : (item.pricing?.completion ? parseFloat(item.pricing.completion) * 1000000 : 1.5),
              currency: 'USD',
              source: 'provider_api',
              isAvailable: true,
              verifiedForKey: true,
              requiresPlan: known ? known.requiresPlan : 'free'
            };
          });

          const combinedMap = new Map();
          apiModels.forEach(m => combinedMap.set(m.id, m));

          // Include fallback models and set availability status for this key
          fallbackList.forEach(m => {
            if (!combinedMap.has(m.id)) {
              // If API returned a real list, mark models not in the key's list as unavailable for this key
              const isAvailable = keyAvailableIds.has(m.id);
              combinedMap.set(m.id, {
                ...m,
                isAvailable,
                verifiedForKey: true,
                unavailableReason: isAvailable ? undefined : 'Sua chave de API não possui permissão para este modelo no plano do provedor.'
              });
            }
          });

          // Sort models: Available first, then current/preview, then legacy
          const sorted = Array.from(combinedMap.values()).sort((a, b) => {
            if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
            const statusOrder = { current: 1, preview: 2, stable: 3, experimental: 4, legacy: 5, deprecated: 6, retired: 7 };
            return (statusOrder[a.status] || 9) - (statusOrder[b.status] || 9);
          });

          // Mark top models as latest for this key
          if (sorted.length > 0 && sorted[0].isAvailable) {
            sorted[0].isLatest = true;
          }

          return sorted;
        }
      }
    }
  } catch (e) {
    if (apiKey && String(e?.message || '').startsWith('PROVIDER_AUTH_FAILED')) {
      throw e;
    }
    // Fallback to catalog if network/API fails without proving the key invalid.
  }

  // Fallback catalog with top model marked as latest
  const catalog = (FALLBACK_CATALOG[provider] || []).map((m, idx) => ({
    ...m,
    isLatest: idx === 0,
    verifiedForKey: false
  }));

  return catalog;
}

export {
  FALLBACK_CATALOG,
  canUseModel,
  getModelsForProvider
};
