import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from './Icon';
import { brandFor, filterAllowed, groupByFamily, isAllowed, prettyName } from '../lib/models';
import type { OpenRouterModel } from '../lib/types';

interface Props {
  models: OpenRouterModel[];
  value: string;
  onChange: (id: string) => void;
  compact?: boolean;
}

export function ModelSelector({ models, value, onChange, compact }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener('mousedown', onDoc);
    return () => window.removeEventListener('mousedown', onDoc);
  }, []);

  const allowed = useMemo(() => filterAllowed(models), [models]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allowed;
    return allowed.filter(
      (m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
    );
  }, [allowed, query]);

  const groups = useMemo(() => groupByFamily(filtered), [filtered]);

  const current = models.find((m) => m.id === value);
  const brand = brandFor(value);
  const displayName = prettyName(value, current?.name);
  const valueIsAllowed = isAllowed(value);

  return (
    <div className="relative no-drag" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 rounded-lg border border-line bg-bg-elev hover:bg-bg-panel transition px-3 ${
          compact ? 'py-1.5 text-xs' : 'py-2 text-sm'
        }`}
      >
        <span className="w-2 h-2 rounded-full" style={{ background: brand.color }} />
        <span className="text-ink font-medium truncate max-w-[220px]">{displayName}</span>
        {!valueIsAllowed && (
          <span className="text-[10px] text-amber-400/80">legacy</span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-ink-mute" />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-[380px] max-h-[480px] rounded-xl border border-line bg-bg-elev shadow-2xl shadow-black/50 overflow-hidden animate-slide-up">
          <div className="flex items-center gap-2 p-2 border-b border-line">
            <Search className="w-4 h-4 text-ink-mute ml-1" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="flex-1 bg-transparent outline-none text-sm text-ink placeholder-ink-mute py-1"
            />
          </div>
          <div className="overflow-y-auto max-h-[420px] py-1">
            {groups.map((g) => (
              <div key={g.key}>
                <div className="px-3 py-1.5 text-[11px] uppercase tracking-wider text-ink-mute">
                  {g.label}
                </div>
                {g.items.map((m) => (
                  <ModelRow
                    key={m.id}
                    model={m}
                    active={m.id === value}
                    onClick={() => {
                      onChange(m.id);
                      setOpen(false);
                    }}
                  />
                ))}
              </div>
            ))}
            {groups.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-ink-mute">
                {allowed.length === 0
                  ? 'No matching models available on your account yet.'
                  : 'No models match your search.'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function variantBadge(id: string): { label: string; color: string } | null {
  const lower = id.toLowerCase();
  if (/\bfast\b|-fast(-|$)/.test(lower)) return { label: 'Fast', color: '#facc15' };
  if (/\bturbo\b|-turbo(-|$)/.test(lower)) return { label: 'Turbo', color: '#fb923c' };
  if (/\bpro\b|-pro(-|$)/.test(lower)) return { label: 'Pro', color: '#a855f7' };
  if (/\bair\b|-air(-|$)/.test(lower)) return { label: 'Air', color: '#38bdf8' };
  if (/\bmini\b|-mini(-|$)/.test(lower)) return { label: 'Mini', color: '#9ca3af' };
  if (/\bthinking\b/.test(lower)) return { label: 'Thinking', color: '#7c5cff' };
  return null;
}

function ModelRow({
  model,
  active,
  onClick,
}: {
  model: OpenRouterModel;
  active: boolean;
  onClick: () => void;
}) {
  const brand = brandFor(model.id);
  const name = prettyName(model.id, model.name);
  const ctx = model.context_length || model.top_provider?.context_length;
  const badge = variantBadge(model.id);
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 flex items-start gap-3 hover:bg-bg-panel transition ${
        active ? 'bg-bg-panel' : ''
      }`}
    >
      <span
        className="mt-1 w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: brand.color }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ink truncate">{name}</span>
          {badge && (
            <span
              className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ color: badge.color, background: badge.color + '18', border: `1px solid ${badge.color}33` }}
            >
              {badge.label}
            </span>
          )}
          <span className="text-[10px] text-ink-mute uppercase ml-auto">{brand.label}</span>
        </div>
        <div className="text-[11px] text-ink-mute truncate mt-0.5">
          {model.id}
          {ctx ? ` · ${Math.round(ctx / 1000)}k ctx` : ''}
        </div>
      </div>
    </button>
  );
}
