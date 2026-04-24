import { useState } from 'react';
import { X, Key, ExternalLink } from './Icon';
import type { Settings as SettingsType, OpenRouterModel } from '../lib/types';
import { ModelSelector } from './ModelSelector';

interface Props {
  settings: SettingsType;
  models: OpenRouterModel[];
  onChange: (s: SettingsType) => void;
  onClose: () => void;
}

export function Settings({ settings, models, onChange, onClose }: Props) {
  const [local, setLocal] = useState(settings);
  const [showKey, setShowKey] = useState(false);

  function save() {
    onChange(local);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-[560px] max-h-[90vh] overflow-y-auto rounded-2xl bg-bg-elev border border-line shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 className="text-base font-semibold text-ink">Settings</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-bg-panel text-ink-mute hover:text-ink transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-ink mb-2">
              <Key className="w-3.5 h-3.5" /> OpenRouter API Key
            </label>
            <div className="flex gap-2">
              <input
                type={showKey ? 'text' : 'password'}
                value={local.apiKey}
                onChange={(e) => setLocal({ ...local, apiKey: e.target.value })}
                placeholder="sk-or-v1-..."
                className="flex-1 rounded-lg bg-bg-soft border border-line px-3 py-2 text-sm text-ink outline-none focus:border-accent/50"
              />
              <button
                onClick={() => setShowKey((s) => !s)}
                className="px-3 py-2 rounded-lg border border-line bg-bg-soft hover:bg-bg-panel text-xs text-ink-dim hover:text-ink transition"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:underline"
            >
              Get a key at openrouter.ai/keys <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-2">Default model</label>
            <ModelSelector
              models={models}
              value={local.defaultModel}
              onChange={(id) => setLocal({ ...local, defaultModel: id })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              Temperature <span className="text-ink-mute font-normal">({local.temperature.toFixed(2)})</span>
            </label>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={local.temperature}
              onChange={(e) => setLocal({ ...local, temperature: parseFloat(e.target.value) })}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-[11px] text-ink-mute mt-1">
              <span>Precise</span>
              <span>Balanced</span>
              <span>Creative</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              Max output tokens{' '}
              <span className="text-ink-mute font-normal">
                ({(local.maxTokens ?? 4096).toLocaleString()})
              </span>
            </label>
            <input
              type="range"
              min={512}
              max={16384}
              step={256}
              value={local.maxTokens ?? 4096}
              onChange={(e) => setLocal({ ...local, maxTokens: parseInt(e.target.value) })}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-[11px] text-ink-mute mt-1">
              <span>Cheap · short</span>
              <span>Long · expensive</span>
            </div>
            <p className="text-[11px] text-ink-mute mt-2">
              Lower this if you hit an HTTP 402 credit error. Some models reserve huge
              reasoning budgets by default.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-2">System prompt</label>
            <textarea
              value={local.systemPrompt}
              onChange={(e) => setLocal({ ...local, systemPrompt: e.target.value })}
              placeholder="Optional. Instructions applied to every new chat."
              rows={3}
              className="w-full rounded-lg bg-bg-soft border border-line px-3 py-2 text-sm text-ink outline-none focus:border-accent/50 resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-line flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-ink-dim hover:text-ink hover:bg-bg-panel transition"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="px-4 py-2 rounded-lg bg-accent hover:bg-accent/90 text-white text-sm font-medium transition"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
