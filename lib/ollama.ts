/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface OllamaModelInfo {
  name: string;
  model?: string;
  modified_at?: string;
  size?: number;
  digest?: string;
  details?: {
    format?: string;
    family?: string;
    parameter_size?: string;
    quantization_level?: string;
  };
}

export const POPULAR_FALLBACK_MODELS = [
  'llama3.2:latest',
  'qwen2.5:latest',
  'mistral:latest',
  'gemma2:latest',
  'phi3:latest',
  'llama3.1:8b',
];

const getCandidatesEndpoints = (baseEndpoint: string) => {
  const normalized = baseEndpoint.replace(/\/+$/, '');
  const endpoints = [normalized];
  if (normalized.includes('localhost')) {
    endpoints.push(normalized.replace('localhost', '127.0.0.1'));
  } else if (normalized.includes('127.0.0.1')) {
    endpoints.push(normalized.replace('127.0.0.1', 'localhost'));
  }
  return endpoints;
};

/**
 * Fetch available models from locally hosted Ollama
 */
export async function fetchOllamaModels(endpoint = 'http://localhost:11434'): Promise<{
  models: OllamaModelInfo[];
  isOnline: boolean;
  usedEndpoint: string;
  error?: string;
}> {
  const candidates = getCandidatesEndpoints(endpoint);
  let lastError = '';

  for (const baseUrl of candidates) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`${baseUrl}/api/tags`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const models: OllamaModelInfo[] = data.models || [];
        return {
          models,
          isOnline: true,
          usedEndpoint: baseUrl,
        };
      }
    } catch (err: any) {
      lastError = err?.message || 'Connection failed';
    }
  }

  return {
    models: [],
    isOnline: false,
    usedEndpoint: endpoint,
    error: lastError || 'Ollama offline on port 11434',
  };
}

/**
 * Generate translation using the locally hosted Ollama model
 * preserves the strict translator system prompt
 */
export async function generateOllamaTranslation({
  endpoint = 'http://localhost:11434',
  model,
  systemPrompt,
  text,
}: {
  endpoint?: string;
  model: string;
  systemPrompt: string;
  text: string;
}): Promise<string> {
  const candidates = getCandidatesEndpoints(endpoint);
  let lastError: any = null;

  for (const baseUrl of candidates) {
    try {
      // 1. Try standard /api/chat
      const chatPayload = {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        stream: false,
        options: {
          temperature: 0.2, // low temperature for translation precision
        },
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const res = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatPayload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const content = data.message?.content?.trim();
        if (content) {
          return cleanTranslationOutput(content);
        }
      }

      // 2. Fallback to /api/generate if /api/chat returns non-200
      const genPayload = {
        model,
        system: systemPrompt,
        prompt: text,
        stream: false,
        options: {
          temperature: 0.2,
        },
      };

      const genController = new AbortController();
      const genTimeoutId = setTimeout(() => genController.abort(), 45000);

      const genRes = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(genPayload),
        signal: genController.signal,
      });
      clearTimeout(genTimeoutId);

      if (genRes.ok) {
        const genData = await genRes.json();
        const content = genData.response?.trim();
        if (content) {
          return cleanTranslationOutput(content);
        }
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  throw new Error(
    `Failed to get response from Ollama at ${endpoint} (${lastError?.message || 'Server unreachable'}). Please verify 'ollama serve' is running.`
  );
}

/**
 * Remove accidental conversational meta wrappers if the model leaked any
 */
function cleanTranslationOutput(output: string): string {
  let cleaned = output.trim();
  // Remove markdown quotes or code blocks if present
  if (cleaned.startsWith('```') && cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
  }
  // Strip common translation prefixes if model hallucinates them
  cleaned = cleaned.replace(/^(Translation:|Vertaling:|Traduction:|Traducción:)\s*/i, '');
  return cleaned;
}
