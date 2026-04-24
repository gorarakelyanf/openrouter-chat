import { memo, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Copy, Check, RefreshCw, Trash2, Brain, AlertCircle } from './Icon';
import { ModelPill } from './ModelPill';
import type { Message } from '../lib/types';

interface Props {
  message: Message;
  // Stable callbacks that receive the id — keep these referentially stable in
  // the parent (useCallback with no changing deps) so React.memo can bail out
  // and skip re-rendering every bubble on each streaming chunk.
  onRegenerate?: (id: string) => void;
  onDelete?: (id: string) => void;
  compact?: boolean;
}

// Memoized markdown body. Keyed on content so only the streaming bubble (whose
// content actually changes) re-parses markdown; stable older messages bail out.
const MarkdownBody = memo(function MarkdownBody({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        a: ({ node, ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
});

function MessageBubbleImpl({ message, onRegenerate, onDelete, compact }: Props) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  // Coarse-grained chunking of streaming content: only update markdown when
  // content length crosses 32-char boundaries (or the final flush). Cuts
  // markdown re-parses ~30x during streaming without visible lag.
  const bodyContent = useMemo(() => {
    if (!message.pending) return message.content;
    const len = message.content.length;
    const snapped = len - (len % 32);
    return message.content.slice(0, snapped);
  }, [message.content, message.pending]);

  if (isUser) {
    return (
      <div className="flex justify-end animate-slide-up">
        <div className="group max-w-[85%]">
          <div className="bg-bg-panel border border-line rounded-2xl rounded-tr-sm px-4 py-3 whitespace-pre-wrap text-ink">
            {message.content}
          </div>
          <div className="flex justify-end gap-1 mt-1 opacity-0 group-hover:opacity-100 transition">
            <IconBtn onClick={copy}>
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </IconBtn>
            {onDelete && (
              <IconBtn onClick={() => onDelete(message.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </IconBtn>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex animate-slide-up">
      <div className="group w-full">
        {message.model && !compact && (
          <div className="mb-2">
            <ModelPill modelId={message.model} size="sm" />
          </div>
        )}
        {message.reasoning && (
          <details className="thinking-block" open={message.pending}>
            <summary>
              <Brain className="w-3.5 h-3.5" /> Thinking
              {message.pending && (
                <span className="text-ink-mute text-[11px] ml-auto">streaming…</span>
              )}
            </summary>
            <div className="whitespace-pre-wrap text-[13px] leading-relaxed opacity-90">
              {message.reasoning}
            </div>
          </details>
        )}
        {message.error ? (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-300">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="whitespace-pre-wrap">{message.error}</span>
          </div>
        ) : (
          <div
            className={`prose-chat ${
              message.pending && !message.content ? 'text-ink-mute italic' : ''
            }`}
          >
            {bodyContent ? (
              <MarkdownBody content={bodyContent} />
            ) : message.pending ? (
              <span className="blink text-ink-mute">Thinking</span>
            ) : null}
          </div>
        )}
        <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition">
          {message.content && (
            <IconBtn onClick={copy}>
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </IconBtn>
          )}
          {onRegenerate && !message.pending && (
            <IconBtn onClick={() => onRegenerate(message.id)}>
              <RefreshCw className="w-3.5 h-3.5" />
            </IconBtn>
          )}
          {onDelete && (
            <IconBtn onClick={() => onDelete(message.id)}>
              <Trash2 className="w-3.5 h-3.5" />
            </IconBtn>
          )}
        </div>
      </div>
    </div>
  );
}

// Shallow-prop comparison is enough because parents now pass stable callbacks
// and the `message` object only changes identity when its fields do.
export const MessageBubble = memo(MessageBubbleImpl);

function IconBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 rounded-md text-ink-mute hover:text-ink hover:bg-bg-panel transition"
    >
      {children}
    </button>
  );
}
