import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { Sidebar } from './components/Sidebar';
import { Composer } from './components/Composer';
import { MessageBubble } from './components/MessageBubble';
import { ModelSelector } from './components/ModelSelector';
import { Settings as SettingsPanel } from './components/Settings';
import { Welcome } from './components/Welcome';
import { ModelPill } from './components/ModelPill';
import { PanelLeftOpen, Plus, X, SettingsIcon, AlertCircle, ChevronDown } from './components/Icon';
import { listModels, streamCompletion, toApiMessages } from './lib/openrouter';
import { filterAllowed, pickDefaultModel } from './lib/models';
import {
  loadChats,
  loadSettings,
  loadActive,
  saveChats,
  saveSettings,
  saveActive,
} from './lib/storage';
import type { Chat, ChatMode, Message, OpenRouterModel, Settings, ViewMode } from './lib/types';

function makeChat(model: string, mode: ChatMode, systemPrompt: string): Chat {
  const now = Date.now();
  return {
    id: uuid(),
    title: 'New chat',
    model,
    mode,
    messages: [],
    createdAt: now,
    updatedAt: now,
    systemPrompt,
  };
}

export default function App() {
  const [chats, setChats] = useState<Chat[]>(() => loadChats());
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [activeId, setActiveId] = useState<string | null>(() => loadActive());
  const [view, setView] = useState<ViewMode>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  // Compare mode state
  const [cmpModels, setCmpModels] = useState<string[]>([
    'openai/gpt-5',
    'z-ai/glm-4.6',
  ]);
  const [cmpInput, setCmpInput] = useState('');
  const [cmpRuns, setCmpRuns] = useState<CompareRun[]>([]);
  const [cmpStreaming, setCmpStreaming] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const cmpAborts = useRef<AbortController[]>([]);

  useEffect(() => saveChats(chats), [chats]);
  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => saveActive(activeId), [activeId]);

  // Fetch models
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listModels(settings.apiKey);
        if (cancelled) return;
        setModels(list);
        setModelsError(null);

        const allowed = filterAllowed(list);
        const allowedIds = new Set(allowed.map((m) => m.id));

        // Snap the default model to a real allowed ID if the saved one is gone.
        setSettings((prev) => {
          if (allowedIds.has(prev.defaultModel)) return prev;
          return { ...prev, defaultModel: pickDefaultModel(list) };
        });

        // Same for the compare columns.
        setCmpModels((prev) => {
          const fixed = prev.map((id) =>
            allowedIds.has(id) ? id : pickDefaultModel(list)
          );
          // Ensure the two columns aren't the same.
          if (fixed[0] === fixed[1]) {
            const alt = allowed.find((m) => m.id !== fixed[0]);
            if (alt) fixed[1] = alt.id;
          }
          return fixed;
        });
      } catch (e: any) {
        if (!cancelled) setModelsError(e.message || 'Failed to load models');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [settings.apiKey]);

  const active = useMemo(() => chats.find((c) => c.id === activeId) || null, [chats, activeId]);
  const hasKey = settings.apiKey.trim().length > 0;

  const updateChat = useCallback((id: string, patch: Partial<Chat> | ((c: Chat) => Partial<Chat>)) => {
    setChats((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const p = typeof patch === 'function' ? patch(c) : patch;
        return { ...c, ...p, updatedAt: Date.now() };
      })
    );
  }, []);

  const newChat = useCallback(() => {
    const c = makeChat(settings.defaultModel, settings.defaultMode, settings.systemPrompt);
    setChats((prev) => [c, ...prev]);
    setActiveId(c.id);
    setView('chat');
    setInput('');
  }, [settings]);

  const deleteChat = useCallback(
    (id: string) => {
      setChats((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) setActiveId(null);
    },
    [activeId]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const send = useCallback(async () => {
    if (!active || !input.trim() || streaming) return;
    if (!hasKey) {
      setSettingsOpen(true);
      return;
    }
    const text = input.trim();
    setInput('');

    const userMsg: Message = {
      id: uuid(),
      role: 'user',
      content: text,
      createdAt: Date.now(),
    };
    const botMsg: Message = {
      id: uuid(),
      role: 'assistant',
      content: '',
      model: active.model,
      createdAt: Date.now(),
      pending: true,
    };

    const nextMessages = [...active.messages, userMsg, botMsg];
    const nextTitle =
      active.messages.length === 0 && active.title === 'New chat'
        ? text.slice(0, 48) + (text.length > 48 ? '…' : '')
        : active.title;
    updateChat(active.id, { messages: nextMessages, title: nextTitle });

    const apiMsgs = toApiMessages([...active.messages, userMsg], active.systemPrompt || settings.systemPrompt);
    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);

    await streamCompletion(
      {
        apiKey: settings.apiKey,
        model: active.model,
        messages: apiMsgs,
        mode: active.mode,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        signal: controller.signal,
      },
      {
        onDelta: (content) => {
          setChats((prev) =>
            prev.map((c) =>
              c.id !== active.id
                ? c
                : {
                    ...c,
                    messages: c.messages.map((m) => (m.id === botMsg.id ? { ...m, content } : m)),
                  }
            )
          );
        },
        onReasoning: (reasoning) => {
          setChats((prev) =>
            prev.map((c) =>
              c.id !== active.id
                ? c
                : {
                    ...c,
                    messages: c.messages.map((m) => (m.id === botMsg.id ? { ...m, reasoning } : m)),
                  }
            )
          );
        },
        onDone: (finalText, reasoning) => {
          setChats((prev) =>
            prev.map((c) =>
              c.id !== active.id
                ? c
                : {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === botMsg.id
                        ? { ...m, content: finalText, reasoning, pending: false }
                        : m
                    ),
                  }
            )
          );
          setStreaming(false);
          abortRef.current = null;
        },
        onError: (err) => {
          setChats((prev) =>
            prev.map((c) =>
              c.id !== active.id
                ? c
                : {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === botMsg.id ? { ...m, error: err.message, pending: false } : m
                    ),
                  }
            )
          );
          setStreaming(false);
          abortRef.current = null;
        },
      }
    );
  }, [active, input, streaming, hasKey, settings, updateChat]);

  const regenerate = useCallback(
    (messageId: string) => {
      if (!active || streaming) return;
      const idx = active.messages.findIndex((m) => m.id === messageId);
      if (idx < 0) return;
      // Find last user message before this assistant message
      let userIdx = idx - 1;
      while (userIdx >= 0 && active.messages[userIdx].role !== 'user') userIdx--;
      if (userIdx < 0) return;
      const userMsg = active.messages[userIdx];
      const keep = active.messages.slice(0, userIdx);
      updateChat(active.id, { messages: keep });
      setActiveId(active.id);
      setInput(userMsg.content);
      // Defer send until state flushes
      setTimeout(() => {
        setInput('');
        // Reconstruct a synthetic send by directly invoking a mini flow
        doRegenerate(active.id, keep, userMsg);
      }, 0);
    },
    [active, streaming]
  );

  const doRegenerate = useCallback(
    (chatId: string, keep: Message[], userMsg: Message) => {
      const chat = chats.find((c) => c.id === chatId);
      if (!chat) return;
      const botMsg: Message = {
        id: uuid(),
        role: 'assistant',
        content: '',
        model: chat.model,
        createdAt: Date.now(),
        pending: true,
      };
      updateChat(chatId, { messages: [...keep, userMsg, botMsg] });
      const apiMsgs = toApiMessages([...keep, userMsg], chat.systemPrompt || settings.systemPrompt);
      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming(true);
      streamCompletion(
        {
          apiKey: settings.apiKey,
          model: chat.model,
          messages: apiMsgs,
          mode: chat.mode,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens,
          signal: controller.signal,
        },
        {
          onDelta: (content) =>
            setChats((prev) =>
              prev.map((c) =>
                c.id !== chatId
                  ? c
                  : {
                      ...c,
                      messages: c.messages.map((m) => (m.id === botMsg.id ? { ...m, content } : m)),
                    }
              )
            ),
          onReasoning: (reasoning) =>
            setChats((prev) =>
              prev.map((c) =>
                c.id !== chatId
                  ? c
                  : {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === botMsg.id ? { ...m, reasoning } : m
                      ),
                    }
              )
            ),
          onDone: (finalText, reasoning) => {
            setChats((prev) =>
              prev.map((c) =>
                c.id !== chatId
                  ? c
                  : {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === botMsg.id
                          ? { ...m, content: finalText, reasoning, pending: false }
                          : m
                      ),
                    }
              )
            );
            setStreaming(false);
          },
          onError: (err) => {
            setChats((prev) =>
              prev.map((c) =>
                c.id !== chatId
                  ? c
                  : {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === botMsg.id ? { ...m, error: err.message, pending: false } : m
                      ),
                    }
              )
            );
            setStreaming(false);
          },
        }
      );
    },
    [chats, settings, updateChat]
  );

  const deleteMessage = useCallback(
    (messageId: string) => {
      if (!active) return;
      updateChat(active.id, (c) => ({
        messages: c.messages.filter((m) => m.id !== messageId),
      }));
    },
    [active, updateChat]
  );

  // Compare mode
  const runCompare = useCallback(async () => {
    if (!cmpInput.trim() || cmpStreaming) return;
    if (!hasKey) {
      setSettingsOpen(true);
      return;
    }
    const prompt = cmpInput.trim();
    setCmpInput('');
    const runs: CompareRun[] = cmpModels.map((id) => ({
      id: uuid(),
      modelId: id,
      content: '',
      reasoning: '',
      pending: true,
      error: undefined,
    }));
    setCmpRuns(runs);
    setCmpStreaming(true);
    cmpAborts.current = [];

    await Promise.all(
      runs.map(async (r) => {
        const controller = new AbortController();
        cmpAborts.current.push(controller);
        await streamCompletion(
          {
            apiKey: settings.apiKey,
            model: r.modelId,
            messages: [
              ...(settings.systemPrompt
                ? [{ role: 'system', content: settings.systemPrompt }]
                : []),
              { role: 'user', content: prompt },
            ],
            mode: 'default',
            temperature: settings.temperature,
            maxTokens: settings.maxTokens,
            signal: controller.signal,
          },
          {
            onDelta: (content) =>
              setCmpRuns((prev) => prev.map((x) => (x.id === r.id ? { ...x, content } : x))),
            onReasoning: (reasoning) =>
              setCmpRuns((prev) => prev.map((x) => (x.id === r.id ? { ...x, reasoning } : x))),
            onDone: (finalText, reasoning) =>
              setCmpRuns((prev) =>
                prev.map((x) =>
                  x.id === r.id
                    ? { ...x, content: finalText, reasoning: reasoning ?? '', pending: false }
                    : x
                )
              ),
            onError: (err) =>
              setCmpRuns((prev) =>
                prev.map((x) =>
                  x.id === r.id ? { ...x, error: err.message, pending: false } : x
                )
              ),
          }
        );
      })
    );
    setCmpStreaming(false);
    cmpAborts.current = [];
  }, [cmpInput, cmpStreaming, cmpModels, settings, hasKey]);

  const stopCompare = () => {
    cmpAborts.current.forEach((a) => a.abort());
    cmpAborts.current = [];
    setCmpStreaming(false);
  };

  return (
    <div className="h-full w-full flex bg-bg">
      {sidebarOpen && (
        <Sidebar
          chats={chats}
          activeId={activeId}
          view={view}
          onSelect={(id) => {
            setActiveId(id);
            setView('chat');
          }}
          onNewChat={newChat}
          onDelete={deleteChat}
          onOpenSettings={() => setSettingsOpen(true)}
          onToggleCompare={() => setView((v) => (v === 'compare' ? 'chat' : 'compare'))}
          onCollapse={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top bar */}
        <div className="h-[44px] border-b border-line flex items-center gap-2 px-3 drag">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="no-drag p-1.5 rounded hover:bg-bg-panel text-ink-mute hover:text-ink transition"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-2 no-drag">
            {view === 'chat' && active && (
              <>
                <ModelSelector
                  models={models}
                  value={active.model}
                  onChange={(id) => updateChat(active.id, { model: id })}
                />
                <span
                  className="text-[11px] text-ink-mute hidden md:inline select-all"
                  title="Click to copy the exact OpenRouter slug"
                >
                  {active.model}
                </span>
              </>
            )}
            {view === 'compare' && (
              <span className="text-sm text-ink font-medium">Compare</span>
            )}
          </div>
          <div className="flex-1" />
          <div className="no-drag flex items-center gap-1">
            {view === 'chat' && active && (
              <button
                onClick={newChat}
                className="p-1.5 rounded hover:bg-bg-panel text-ink-mute hover:text-ink transition"
                title="New chat"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-1.5 rounded hover:bg-bg-panel text-ink-mute hover:text-ink transition"
              title="Settings"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {modelsError && (
          <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5" /> {modelsError} — add a valid key in Settings.
          </div>
        )}

        {view === 'chat' ? (
          active ? (
            <ChatView
              chat={active}
              streaming={streaming}
              input={input}
              onInput={setInput}
              onSend={send}
              onStop={stop}
              onRegenerate={regenerate}
              onDeleteMessage={deleteMessage}
            />
          ) : (
            <Welcome
              hasKey={hasKey}
              onOpenSettings={() => setSettingsOpen(true)}
              onExample={(text) => {
                const c = makeChat(settings.defaultModel, settings.defaultMode, settings.systemPrompt);
                setChats((prev) => [c, ...prev]);
                setActiveId(c.id);
                setView('chat');
                setInput(text);
              }}
            />
          )
        ) : (
          <CompareView
            models={models}
            cmpModels={cmpModels}
            setCmpModels={setCmpModels}
            input={cmpInput}
            setInput={setCmpInput}
            runs={cmpRuns}
            streaming={cmpStreaming}
            onRun={runCompare}
            onStop={stopCompare}
          />
        )}
      </main>

      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          models={models}
          onChange={setSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}

function ChatView({
  chat,
  streaming,
  input,
  onInput,
  onSend,
  onStop,
  onRegenerate,
  onDeleteMessage,
}: {
  chat: Chat;
  streaming: boolean;
  input: string;
  onInput: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  onRegenerate: (id: string) => void;
  onDeleteMessage: (id: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const prevCountRef = useRef(chat.messages.length);
  const [showJump, setShowJump] = useState(false);

  // Track whether user is near the bottom. If they scroll up, we stop
  // auto-scrolling so they can read mid-stream.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      const near = dist < 48;
      stickRef.current = near;
      setShowJump(!near);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Runs on every render (including every streaming token). Only pins to
  // bottom when the user is already there, or when the user just sent a
  // new message (in which case we always snap).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const count = chat.messages.length;
    const grew = count > prevCountRef.current;
    prevCountRef.current = count;
    const lastRole = chat.messages[count - 1]?.role;
    if (grew && lastRole === 'user') {
      el.scrollTop = el.scrollHeight;
      stickRef.current = true;
      setShowJump(false);
      return;
    }
    if (stickRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  });

  const jumpToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    stickRef.current = true;
    setShowJump(false);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-[760px] mx-auto px-6 py-8 space-y-6">
          {chat.messages.length === 0 && (
            <div className="text-center text-sm text-ink-mute py-20">
              Send a message to start.
            </div>
          )}
          {chat.messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              onRegenerate={m.role === 'assistant' ? onRegenerate : undefined}
              onDelete={onDeleteMessage}
            />
          ))}
        </div>
      </div>
      {showJump && (
        <button
          onClick={jumpToBottom}
          className="absolute left-1/2 -translate-x-1/2 bottom-[120px] z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bg-elev border border-line text-xs text-ink-dim hover:text-ink hover:bg-bg-panel shadow-lg shadow-black/40 transition animate-slide-up"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          {streaming ? 'Jump to latest' : 'Back to bottom'}
        </button>
      )}
      <div className="border-t border-line bg-bg">
        <div className="max-w-[760px] mx-auto px-6 py-4">
          <Composer
            value={input}
            onChange={onInput}
            onSubmit={onSend}
            onStop={onStop}
            streaming={streaming}
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}

interface CompareRun {
  id: string;
  modelId: string;
  content: string;
  reasoning: string;
  pending: boolean;
  error?: string;
}

function CompareView({
  models,
  cmpModels,
  setCmpModels,
  input,
  setInput,
  runs,
  streaming,
  onRun,
  onStop,
}: {
  models: OpenRouterModel[];
  cmpModels: string[];
  setCmpModels: (v: string[]) => void;
  input: string;
  setInput: (v: string) => void;
  runs: CompareRun[];
  streaming: boolean;
  onRun: () => void;
  onStop: () => void;
}) {
  const addColumn = () => {
    if (cmpModels.length >= 4) return;
    const allowed = filterAllowed(models);
    const fallback =
      allowed.find((m) => !cmpModels.includes(m.id))?.id || cmpModels[0];
    setCmpModels([...cmpModels, fallback]);
  };
  const removeColumn = (idx: number) => {
    if (cmpModels.length <= 2) return;
    setCmpModels(cmpModels.filter((_, i) => i !== idx));
  };
  const changeColumn = (idx: number, id: string) => {
    setCmpModels(cmpModels.map((m, i) => (i === idx ? id : m)));
  };

  return (
    <>
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 grid grid-cols-[repeat(var(--cols),1fr)]" style={{ ['--cols' as any]: cmpModels.length }}>
          {cmpModels.map((modelId, idx) => {
            const columnRun =
              runs[idx] && runs[idx].modelId === modelId
                ? runs[idx]
                : runs.find((r) => r.modelId === modelId);
            return (
              <div
                key={idx}
                className={`flex flex-col min-w-0 ${idx > 0 ? 'border-l border-line' : ''}`}
              >
                <div className="flex items-center gap-2 px-3 py-2 border-b border-line bg-bg-soft">
                  <ModelSelector
                    models={models}
                    value={modelId}
                    onChange={(id) => changeColumn(idx, id)}
                    compact
                  />
                  <div className="flex-1" />
                  {cmpModels.length > 2 && (
                    <button
                      onClick={() => removeColumn(idx)}
                      className="p-1 rounded hover:bg-bg-panel text-ink-mute hover:text-red-400 transition"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {!columnRun ? (
                    <div className="text-center text-xs text-ink-mute pt-8">
                      Send a prompt to compare responses.
                    </div>
                  ) : columnRun.error ? (
                    <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-300">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span className="whitespace-pre-wrap">{columnRun.error}</span>
                    </div>
                  ) : (
                    <MessageBubble
                      compact
                      message={{
                        id: columnRun.id,
                        role: 'assistant',
                        content: columnRun.content,
                        reasoning: columnRun.reasoning || undefined,
                        pending: columnRun.pending,
                        createdAt: 0,
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="border-t border-line bg-bg">
        <div className="max-w-[1100px] mx-auto px-6 py-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-ink-mute">{cmpModels.length} models side-by-side</span>
            <div className="flex-1" />
            {cmpModels.length < 4 && (
              <button
                onClick={addColumn}
                className="flex items-center gap-1 text-xs text-ink-dim hover:text-ink bg-bg-elev hover:bg-bg-panel border border-line rounded-md px-2 py-1 transition"
              >
                <Plus className="w-3 h-3" /> Add model
              </button>
            )}
          </div>
          <Composer
            value={input}
            onChange={setInput}
            onSubmit={onRun}
            onStop={onStop}
            streaming={streaming}
            placeholder="Ask all selected models at once..."
          />
        </div>
      </div>
    </>
  );
}
