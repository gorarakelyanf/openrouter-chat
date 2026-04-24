import { MessageSquare, Plus, SplitSquareHorizontal, Trash2, SettingsIcon, PanelLeftClose } from './Icon';
import type { Chat, ViewMode } from '../lib/types';

interface Props {
  chats: Chat[];
  activeId: string | null;
  view: ViewMode;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  onOpenSettings: () => void;
  onToggleCompare: () => void;
  onCollapse: () => void;
}

export function Sidebar({
  chats,
  activeId,
  view,
  onSelect,
  onNewChat,
  onDelete,
  onOpenSettings,
  onToggleCompare,
  onCollapse,
}: Props) {
  const sorted = [...chats].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <aside className="w-[260px] flex-shrink-0 bg-bg-soft border-r border-line flex flex-col h-full">
      <div className="h-[44px] flex items-center justify-between px-3 drag">
        <div className="flex items-center gap-2 no-drag">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center">
            <MessageSquare className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[13px] font-semibold text-ink">OpenRouter</span>
        </div>
        <button onClick={onCollapse} className="p-1.5 rounded hover:bg-bg-panel text-ink-mute hover:text-ink transition no-drag">
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      <div className="px-2 pt-1 pb-2 no-drag">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 rounded-lg bg-bg-elev hover:bg-bg-panel border border-line text-ink px-3 py-2 text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" /> New chat
        </button>
        <button
          onClick={onToggleCompare}
          className={`w-full mt-1.5 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
            view === 'compare'
              ? 'bg-accent-soft border-accent/30 text-accent'
              : 'bg-bg-elev hover:bg-bg-panel border-line text-ink-dim hover:text-ink'
          }`}
        >
          <SplitSquareHorizontal className="w-4 h-4" /> Compare models
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-1.5 pb-2 no-drag">
        <div className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-ink-mute">Chats</div>
        {sorted.length === 0 && (
          <div className="px-3 py-4 text-xs text-ink-mute text-center">
            No chats yet. Start a new one.
          </div>
        )}
        {sorted.map((c) => (
          <div
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`group flex items-center gap-2 px-2.5 py-2 mx-0.5 rounded-lg cursor-pointer transition ${
              c.id === activeId && view === 'chat'
                ? 'bg-bg-panel text-ink'
                : 'text-ink-dim hover:bg-bg-panel/60 hover:text-ink'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
            <span className="flex-1 text-[13px] truncate">{c.title || 'Untitled'}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(c.id);
              }}
              className="p-1 rounded hover:bg-red-500/15 text-ink-mute hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="border-t border-line p-2 no-drag">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2 rounded-lg hover:bg-bg-panel text-ink-dim hover:text-ink px-3 py-2 text-sm transition"
        >
          <SettingsIcon className="w-4 h-4" /> Settings
        </button>
      </div>
    </aside>
  );
}
