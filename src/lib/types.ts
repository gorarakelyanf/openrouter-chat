export type Role = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: Role;
  content: string;
  reasoning?: string;
  model?: string;
  createdAt: number;
  pending?: boolean;
  error?: string;
}

export interface Chat {
  id: string;
  title: string;
  model: string;
  mode: ChatMode;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  systemPrompt?: string;
}

export type ChatMode = 'default' | 'thinking' | 'fast' | 'web';

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
  architecture?: {
    modality?: string;
    tokenizer?: string;
    input_modalities?: string[];
  };
  supported_parameters?: string[];
  top_provider?: {
    context_length?: number;
    max_completion_tokens?: number;
  };
}

export interface Settings {
  apiKey: string;
  defaultModel: string;
  defaultMode: ChatMode;
  temperature: number;
  maxTokens?: number;
  systemPrompt: string;
}

export type ViewMode = 'chat' | 'compare';
