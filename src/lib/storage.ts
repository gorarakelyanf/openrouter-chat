import type { Chat, Settings } from './types';

const CHATS_KEY = 'orc:chats';
const SETTINGS_KEY = 'orc:settings';
const ACTIVE_KEY = 'orc:active';

export function loadChats(): Chat[] {
  try {
    const raw = localStorage.getItem(CHATS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Chat[];
  } catch {
    return [];
  }
}

export function saveChats(chats: Chat[]) {
  try {
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
  } catch {}
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...defaultSettings(), ...JSON.parse(raw) };
  } catch {}
  return defaultSettings();
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {}
}

export function loadActive(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

export function saveActive(id: string | null) {
  if (id) localStorage.setItem(ACTIVE_KEY, id);
  else localStorage.removeItem(ACTIVE_KEY);
}

export function defaultSettings(): Settings {
  return {
    apiKey: '',
    defaultModel: 'openai/gpt-5',
    defaultMode: 'default',
    temperature: 0.7,
    maxTokens: 4096,
    systemPrompt: '',
  };
}
