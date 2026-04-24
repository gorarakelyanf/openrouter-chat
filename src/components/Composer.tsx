import { useEffect, useRef } from 'react';
import { Send, Square } from './Icon';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  disabled?: boolean;
  streaming?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

export function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
  disabled,
  streaming,
  placeholder = 'Message the model...',
  autoFocus,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 240) + 'px';
  }, [value]);

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (streaming && onStop) {
        onStop();
      } else if (!disabled && value.trim()) {
        onSubmit();
      }
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-bg-elev focus-within:border-accent/40 transition shadow-lg shadow-black/20">
      <textarea
        ref={ref}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        rows={1}
        className="w-full resize-none bg-transparent outline-none px-4 pt-3.5 pb-2 text-[14.5px] text-ink placeholder-ink-mute max-h-[240px]"
      />
      <div className="flex items-center justify-between px-3 pb-2.5">
        <span className="text-[11px] text-ink-mute select-none">
          <span className="opacity-70">⏎</span> send · <span className="opacity-70">⇧⏎</span> newline
        </span>
        {streaming ? (
          <button
            onClick={onStop}
            className="flex items-center gap-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 px-3 py-1.5 text-xs font-medium transition"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            Stop
          </button>
        ) : (
          <button
            disabled={disabled || !value.trim()}
            onClick={onSubmit}
            className="flex items-center gap-1.5 rounded-lg bg-accent hover:bg-accent/90 disabled:bg-bg-panel disabled:text-ink-mute disabled:cursor-not-allowed text-white px-3 py-1.5 text-xs font-medium transition"
          >
            <Send className="w-3.5 h-3.5" /> Send
          </button>
        )}
      </div>
    </div>
  );
}
