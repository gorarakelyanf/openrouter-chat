import { brandFor, prettyName } from '../lib/models';
import type { OpenRouterModel } from '../lib/types';

interface Props {
  modelId: string;
  model?: OpenRouterModel;
  size?: 'sm' | 'md';
}

export function ModelPill({ modelId, model, size = 'md' }: Props) {
  const brand = brandFor(modelId);
  const name = prettyName(modelId, model?.name);
  const sm = size === 'sm';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border ${
        sm ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-xs'
      }`}
      style={{ background: brand.accent, borderColor: brand.color + '33', color: brand.color }}
    >
      <span
        className={`rounded-full ${sm ? 'w-1.5 h-1.5' : 'w-2 h-2'}`}
        style={{ background: brand.color }}
      />
      <span className="font-medium">{name}</span>
    </span>
  );
}
