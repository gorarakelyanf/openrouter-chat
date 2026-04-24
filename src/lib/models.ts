import type { OpenRouterModel } from './types';

// The user's requested model families. We ONLY surface these in the picker.
// Each family matcher catches the current latest version plus close siblings
// (e.g. gpt-5, gpt-5.1, gpt-5-mini) so new releases slot in automatically.
// Each family lists a predicate (broad match) + a "reject" predicate to drop
// known-old variants. We also de-dup and cap per family later.
export const ALLOWED_FAMILIES: Array<{
  key: string;
  label: string;
  match: (id: string) => boolean;
  reject?: (id: string) => boolean;
  maxItems?: number;
}> = [
  {
    key: 'gpt5',
    label: 'OpenAI GPT-5',
    match: (id) => /^openai\/gpt-5(\.|-|$)/i.test(id),
    reject: (id) => /(preview|legacy|\d{4}-\d{2}-\d{2})/i.test(id),
    maxItems: 5,
  },
  {
    key: 'glm',
    label: 'Zhipu GLM',
    match: (id) => /^z-ai\/glm-[5-9]/i.test(id),
    maxItems: 3,
  },
  {
    key: 'kimi',
    label: 'Moonshot Kimi',
    match: (id) => /^moonshotai\/kimi-(k?[2-9]|[2-9])/i.test(id),
    reject: (id) => /-\d{4}$/i.test(id),
    maxItems: 5,
  },
  {
    key: 'gemini-flash',
    label: 'Gemini 3 Flash',
    match: (id) => {
      const l = id.toLowerCase();
      if (!l.startsWith('google/gemini')) return false;
      if (!l.includes('flash')) return false;
      // Keep only 3+. Explicitly reject v1.x and v2.x, in either ordering.
      if (/gemini-[12](?:\.|-)/.test(l)) return false;
      if (/flash-[12](?:\.|-)/.test(l)) return false;
      return true;
    },
    reject: (id) => /(experimental|image-gen|lite)/i.test(id),
    maxItems: 3,
  },
  {
    key: 'qwen-max',
    label: 'Qwen Max',
    match: (id) => /^qwen\/qwen-?[3-9][^/]*max/i.test(id),
    reject: (id) => /\d{4}-\d{2}-\d{2}/i.test(id),
    maxItems: 3,
  },
  {
    key: 'grok',
    label: 'xAI Grok',
    match: (id) => /^x-ai\/grok-[4-9]/i.test(id),
    reject: (id) => /(vision|image|mini)/i.test(id),
    maxItems: 4,
  },
];

// Preferred default IDs — tried in order when setting a sensible default.
// If a given ID doesn't exist on OpenRouter, we fall back to the first
// allowed model we find.
export const PREFERRED_IDS = [
  'openai/gpt-5.1',
  'openai/gpt-5',
  'z-ai/glm-5.1',
  'z-ai/glm-5',
  'z-ai/glm-4.6',
  'moonshotai/kimi-k2.6',
  'moonshotai/kimi-2.6',
  'moonshotai/kimi-k2',
  'google/gemini-3-flash',
  'google/gemini-2.5-flash',
  'qwen/qwen3.6-max',
  'qwen/qwen3-max',
  'x-ai/grok-5',
  'x-ai/grok-4',
];

export function isAllowed(id: string): boolean {
  return ALLOWED_FAMILIES.some((f) => f.match(id) && !f.reject?.(id));
}

export function filterAllowed(models: OpenRouterModel[]): OpenRouterModel[] {
  const out: OpenRouterModel[] = [];
  for (const f of ALLOWED_FAMILIES) {
    const items = models
      .filter((m) => f.match(m.id) && !f.reject?.(m.id))
      .sort((a, b) => b.id.localeCompare(a.id)); // newer version strings first
    const limited = f.maxItems ? items.slice(0, f.maxItems) : items;
    out.push(...limited);
  }
  return out;
}

export interface BrandInfo {
  label: string;
  short: string;
  color: string;
  accent: string;
}

export function brandFor(id: string): BrandInfo {
  const lower = id.toLowerCase();
  if (lower.startsWith('openai/')) return { label: 'OpenAI', short: 'GPT', color: '#10a37f', accent: '#0f3d32' };
  if (lower.startsWith('google/')) return { label: 'Google', short: 'Gemini', color: '#4f8fff', accent: '#172238' };
  if (lower.startsWith('qwen/')) return { label: 'Qwen', short: 'Qwen', color: '#a855f7', accent: '#2a1a3d' };
  if (lower.startsWith('z-ai/') || lower.includes('glm')) return { label: 'Zhipu', short: 'GLM', color: '#38bdf8', accent: '#0f2b3d' };
  if (lower.startsWith('moonshotai/') || lower.includes('kimi')) return { label: 'Moonshot', short: 'Kimi', color: '#facc15', accent: '#3d2f0a' };
  if (lower.startsWith('x-ai/') || lower.includes('grok')) return { label: 'xAI', short: 'Grok', color: '#d1d5db', accent: '#2a2a2f' };
  return { label: 'Model', short: 'AI', color: '#9ca3af', accent: '#26262b' };
}

export function prettyName(id: string, fallback?: string): string {
  if (fallback && !fallback.includes(':')) return fallback;
  const tail = id.split('/').pop() || id;
  return tail
    .split('-')
    .map((p) => (p.length <= 3 ? p.toUpperCase() : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ');
}

export function supportsReasoning(model: OpenRouterModel | string): boolean {
  const id = typeof model === 'string' ? model : model.id;
  const lower = id.toLowerCase();
  if (typeof model !== 'string' && model.supported_parameters?.includes('reasoning')) return true;
  return (
    lower.includes('gpt-5') ||
    lower.includes('gemini-2.5') ||
    lower.includes('gemini-3') ||
    lower.includes('qwen3') ||
    lower.includes('glm-4.6') ||
    lower.includes('glm-5') ||
    lower.includes('kimi') ||
    lower.includes('grok-4') ||
    lower.includes('grok-5')
  );
}

export function groupByFamily(models: OpenRouterModel[]): { key: string; label: string; items: OpenRouterModel[] }[] {
  const groups = ALLOWED_FAMILIES.map((f) => {
    const items = models
      .filter((m) => f.match(m.id) && !f.reject?.(m.id))
      .sort((a, b) => b.id.localeCompare(a.id));
    const limited = f.maxItems ? items.slice(0, f.maxItems) : items;
    return { key: f.key, label: f.label, items: limited };
  });
  return groups.filter((g) => g.items.length > 0);
}

export function pickDefaultModel(models: OpenRouterModel[]): string {
  const allowed = filterAllowed(models);
  for (const id of PREFERRED_IDS) {
    if (allowed.find((m) => m.id === id)) return id;
  }
  return allowed[0]?.id || PREFERRED_IDS[0];
}
