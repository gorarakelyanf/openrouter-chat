import type { ChatMode, Message, OpenRouterModel } from './types';

const BASE = 'https://openrouter.ai/api/v1';

export interface StreamCallbacks {
  onDelta: (text: string) => void;
  onReasoning?: (text: string) => void;
  onDone: (finalText: string, reasoning?: string) => void;
  onError: (err: Error) => void;
}

export interface CompletionOpts {
  apiKey: string;
  model: string;
  messages: { role: string; content: string }[];
  mode: ChatMode;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

function buildExtras(mode: ChatMode, model: string) {
  const extras: Record<string, any> = {};
  if (mode === 'thinking') {
    extras.reasoning = { effort: 'high' };
  } else if (mode === 'fast') {
    extras.reasoning = { exclude: true };
    extras.provider = { sort: 'throughput' };
  } else if (mode === 'web') {
    extras.plugins = [{ id: 'web', max_results: 5 }];
  }
  return extras;
}

export async function listModels(apiKey: string): Promise<OpenRouterModel[]> {
  const res = await fetch(`${BASE}/models`, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
  });
  if (!res.ok) throw new Error(`Failed to fetch models: ${res.status}`);
  const data = await res.json();
  return data.data as OpenRouterModel[];
}

export async function streamCompletion(opts: CompletionOpts, cb: StreamCallbacks) {
  const { apiKey, model, messages, mode, temperature, maxTokens, signal } = opts;
  const body: Record<string, any> = {
    model,
    messages,
    stream: true,
    temperature: temperature ?? 0.7,
    ...buildExtras(mode, model),
  };
  if (maxTokens) body.max_tokens = maxTokens;

  let res: Response;
  try {
    res = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://openrouter-chat.local',
        'X-Title': 'OpenRouter Chat',
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e: any) {
    cb.onError(new Error(e?.message || 'Network error'));
    return;
  }

  if (!res.ok || !res.body) {
    let detail = '';
    try { detail = await res.text(); } catch {}
    cb.onError(new Error(friendlyError(res.status, detail, res.statusText)));
    return;
  }

  // Some providers return JSON error with 200 and no event-stream header.
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('text/event-stream') && ct.includes('application/json')) {
    let detail = '';
    try { detail = await res.text(); } catch {}
    cb.onError(new Error(extractErr(detail) || 'Provider did not stream'));
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  let reasoning = '';
  let sawAny = false;
  let finishReason: string | undefined;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx).replace(/\r$/, '').trim();
        buffer = buffer.slice(idx + 1);
        if (!line || line.startsWith(':')) continue;
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') {
          finalize();
          return;
        }
        let json: any;
        try {
          json = JSON.parse(payload);
        } catch {
          continue;
        }

        // OpenRouter / provider error surfaced inside the stream body.
        if (json.error) {
          cb.onError(new Error(json.error.message || JSON.stringify(json.error)));
          return;
        }

        const choice = json.choices?.[0];
        if (!choice) continue;
        if (choice.finish_reason) finishReason = choice.finish_reason;
        const delta = choice.delta ?? choice.message;
        if (!delta) continue;

        // Reasoning field varies across providers (Kimi/DeepSeek use
        // `reasoning_content`, OpenAI-compatible uses `reasoning`).
        const r = delta.reasoning ?? delta.reasoning_content;
        if (typeof r === 'string' && r) {
          sawAny = true;
          reasoning += r;
          cb.onReasoning?.(reasoning);
        }

        const c = delta.content;
        if (typeof c === 'string' && c) {
          sawAny = true;
          full += c;
          cb.onDelta(full);
        } else if (Array.isArray(c)) {
          // Some providers send content as an array of parts.
          for (const part of c) {
            if (typeof part?.text === 'string' && part.text) {
              sawAny = true;
              full += part.text;
              cb.onDelta(full);
            }
          }
        }
      }
    }
    finalize();
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      cb.onDone(full, reasoning || undefined);
      return;
    }
    cb.onError(new Error(e?.message || 'Stream error'));
  }

  function finalize() {
    if (!sawAny && !full && !reasoning) {
      cb.onError(
        new Error(
          finishReason === 'content_filter'
            ? 'The provider blocked this response (content filter).'
            : finishReason === 'length'
            ? 'The response was truncated before anything was produced — raise Max output tokens in Settings.'
            : 'The provider returned no content. Try a different model or check your credits.'
        )
      );
      return;
    }
    cb.onDone(full, reasoning || undefined);
  }
}

function extractErr(body: string): string | null {
  try {
    const j = JSON.parse(body);
    if (j?.error?.message) return String(j.error.message);
  } catch {}
  return null;
}

function friendlyError(status: number, body: string, fallback: string): string {
  const msg = extractErr(body) || body || fallback;
  if (status === 401) return `Invalid OpenRouter API key. ${msg}`;
  if (status === 402) return `Insufficient credits or request too large. ${msg}`;
  if (status === 429) return `Rate limited by the provider. Try again in a moment. ${msg}`;
  if (status >= 500) return `Provider error (${status}). ${msg}`;
  return `HTTP ${status}: ${msg}`;
}

export function toApiMessages(messages: Message[], systemPrompt?: string) {
  const out: { role: string; content: string }[] = [];
  if (systemPrompt?.trim()) {
    out.push({ role: 'system', content: systemPrompt.trim() });
  }
  for (const m of messages) {
    if (m.error) continue;
    if (!m.content?.trim() && m.role !== 'user') continue;
    out.push({ role: m.role, content: m.content });
  }
  return out;
}
