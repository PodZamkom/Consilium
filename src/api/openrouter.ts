export interface OpenRouterModel {
  id: string;
  name: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
}

const HARDCODED_MODELS: OpenRouterModel[] = [
  { id: 'openai/gpt-5.4', name: 'OpenAI: GPT-5.4', context_length: 128000, pricing: { prompt: '0', completion: '0' } },
  { id: 'anthropic/claude-sonnet-4.6', name: 'Anthropic: Claude Sonnet 4.6', context_length: 128000, pricing: { prompt: '0', completion: '0' } },
  { id: 'deepseek/deepseek-v3.2-exp', name: 'DeepSeek: DeepSeek V3.2 Exp', context_length: 128000, pricing: { prompt: '0', completion: '0' } },
  { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', context_length: 128000, pricing: { prompt: '0', completion: '0' } },
  { id: 'google/gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', context_length: 128000, pricing: { prompt: '0', completion: '0' } },
  { id: 'x-ai/grok-5', name: 'Grok 5', context_length: 128000, pricing: { prompt: '0', completion: '0' } },
];

export async function fetchModels(): Promise<OpenRouterModel[]> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models');
    if (!res.ok) throw new Error('Ошибка загрузки моделей');
    const data = await res.json();
    const fetched = data.data as OpenRouterModel[];
    
    const fetchedIds = new Set(fetched.map(m => m.id));
    const missingHardcoded = HARDCODED_MODELS.filter(m => !fetchedIds.has(m.id));
    
    return [...missingHardcoded, ...fetched].sort((a, b) => a.name.localeCompare(b.name));
  } catch (e) {
    console.warn('Failed to fetch models, using hardcoded fallback', e);
    return HARDCODED_MODELS;
  }
}

export async function sendMessage(
  prompt: string,
  model: string,
  apiKey: string,
  systemPrompt?: string
): Promise<string> {
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'NeuroConsilium'
    },
    body: JSON.stringify({
      model,
      messages,
    })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Ошибка API OpenRouter');
  }

  const data = await res.json();
  return data.choices[0].message.content;
}
