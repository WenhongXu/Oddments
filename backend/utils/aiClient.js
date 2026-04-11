/**
 * Unified AI client — supports:
 *   - Anthropic Claude  (AI_PROVIDER=anthropic)
 *   - DeepSeek          (AI_PROVIDER=deepseek)
 *   - Qwen 通义千问     (AI_PROVIDER=qwen)
 *   - Doubao 豆包       (AI_PROVIDER=doubao)
 *   - Zhipu 智谱        (AI_PROVIDER=zhipu)
 *   - Ollama (local)    (AI_PROVIDER=ollama)
 *   - Any OpenAI-compat (AI_PROVIDER=openai_compat)
 *
 * Env vars:
 *   AI_PROVIDER      = anthropic | deepseek | qwen | doubao | zhipu | ollama | openai_compat
 *   AI_API_KEY       = your API key (not needed for ollama)
 *   AI_MODEL         = override model name (optional, sensible defaults per provider)
 *   AI_BASE_URL      = override base URL (required for openai_compat, optional for others)
 *   AI_MAX_TOKENS    = override max tokens (default: 1500)
 */

import Anthropic from '@anthropic-ai/sdk';

// Provider presets — all OpenAI-compatible except Anthropic
const PRESETS = {
  anthropic: {
    type: 'anthropic',
    defaultModel: 'claude-sonnet-4-6',
  },
  deepseek: {
    type: 'openai_compat',
    baseURL: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
  },
  qwen: {
    type: 'openai_compat',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
  },
  doubao: {
    type: 'openai_compat',
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    defaultModel: 'doubao-pro-32k',  // replace with your endpoint ID
  },
  zhipu: {
    type: 'openai_compat',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4-flash',
  },
  ollama: {
    type: 'openai_compat',
    baseURL: 'http://localhost:11434/v1',
    defaultModel: 'qwen2.5:7b',      // or deepseek-r1:7b, llama3.2 etc.
    apiKey: 'ollama',                 // Ollama ignores the key but needs a non-empty value
  },
  openai_compat: {
    type: 'openai_compat',
    baseURL: null,                    // must be set via AI_BASE_URL
    defaultModel: 'gpt-4o-mini',
  },
};

function getConfig() {
  const provider = (process.env.AI_PROVIDER || 'anthropic').toLowerCase();
  const preset = PRESETS[provider] || PRESETS.openai_compat;

  return {
    type: preset.type,
    apiKey: process.env.AI_API_KEY || preset.apiKey || '',
    model: process.env.AI_MODEL || preset.defaultModel,
    baseURL: process.env.AI_BASE_URL || preset.baseURL,
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '1500'),
    provider,
  };
}

/**
 * Call the AI with a system prompt + messages array.
 * Returns the assistant's reply string.
 *
 * @param {string} systemPrompt
 * @param {Array<{role: 'user'|'assistant', content: string}>} messages
 * @param {number} [maxTokens]
 * @returns {Promise<string>}
 */
export async function callAI(systemPrompt, messages, maxTokens) {
  const cfg = getConfig();
  const tokens = maxTokens || cfg.maxTokens;

  if (cfg.type === 'anthropic') {
    return callAnthropic(cfg, systemPrompt, messages, tokens);
  } else {
    return callOpenAICompat(cfg, systemPrompt, messages, tokens);
  }
}

async function callAnthropic(cfg, systemPrompt, messages, maxTokens) {
  if (!cfg.apiKey) throw new Error('未配置 ANTHROPIC_API_KEY');

  const client = new Anthropic({ apiKey: cfg.apiKey });
  const response = await client.messages.create({
    model: cfg.model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  });
  return response.content[0].text;
}

async function callOpenAICompat(cfg, systemPrompt, messages, maxTokens) {
  if (!cfg.baseURL) {
    throw new Error(`AI_BASE_URL 未配置 (provider: ${cfg.provider})`);
  }
  if (!cfg.apiKey && cfg.provider !== 'ollama') {
    throw new Error(`AI_API_KEY 未配置 (provider: ${cfg.provider})`);
  }

  const url = `${cfg.baseURL.replace(/\/$/, '')}/chat/completions`;

  const body = {
    model: cfg.model,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI API 错误 (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) throw new Error('AI 返回了空响应');
  return text;
}

/**
 * Check whether AI is configured and reachable.
 */
export function isAIConfigured() {
  const cfg = getConfig();
  if (cfg.type === 'anthropic') return !!cfg.apiKey;
  if (cfg.provider === 'ollama') return true; // assume local is always up
  return !!cfg.apiKey && !!cfg.baseURL;
}

export function getAIInfo() {
  const cfg = getConfig();
  return { provider: cfg.provider, model: cfg.model };
}
