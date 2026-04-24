import { Sparkles, Brain, Zap, SplitSquareHorizontal } from './Icon';

interface Props {
  onExample: (text: string) => void;
  hasKey: boolean;
  onOpenSettings: () => void;
}

const EXAMPLES = [
  'Explain quantum entanglement like I am 12.',
  'Write a Python function to debounce an async function.',
  'Draft a polite email declining a meeting.',
  'Compare React Server Components vs traditional SSR.',
];

export function Welcome({ onExample, hasKey, onOpenSettings }: Props) {
  return (
    <div className="flex-1 flex items-center justify-center px-6">
      <div className="max-w-[640px] w-full text-center animate-fade-in">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-purple-500 items-center justify-center mb-4 shadow-lg shadow-accent/20">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-semibold text-ink mb-2">What should we build today?</h1>
        <p className="text-sm text-ink-dim mb-8">
          One interface for every top model. Switch models mid-conversation, compare side-by-side,
          toggle thinking or fast modes.
        </p>

        {!hasKey ? (
          <button
            onClick={onOpenSettings}
            className="rounded-xl bg-accent hover:bg-accent/90 text-white px-5 py-2.5 text-sm font-medium transition"
          >
            Add your OpenRouter key to start
          </button>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {EXAMPLES.map((e) => (
                <button
                  key={e}
                  onClick={() => onExample(e)}
                  className="text-left text-sm text-ink-dim hover:text-ink bg-bg-elev hover:bg-bg-panel border border-line rounded-xl px-4 py-3 transition"
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-center gap-4 text-[11px] text-ink-mute">
              <Feature icon={Brain} label="Thinking mode" />
              <Feature icon={Zap} label="Fast mode" />
              <Feature icon={SplitSquareHorizontal} label="Compare models" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Feature({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5" /> {label}
    </span>
  );
}
