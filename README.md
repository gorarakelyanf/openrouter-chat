# OpenRouter Chat

A beautiful, minimal desktop chat app for every top LLM, powered by [OpenRouter](https://openrouter.ai).

- **Every model, one interface** — GPT, Claude, Gemini, Grok, Qwen, GLM, Kimi, DeepSeek, Llama, Mistral.
- **Modes** — Default, Thinking (high reasoning), Fast (throughput-optimized), Web (with search).
- **Compare** — Run 2–4 models side-by-side on the same prompt.
- **Streaming** — Real-time responses with visible reasoning for thinking models.
- **Local** — Chats and API key live in your browser. No server, no tracking.
- **Desktop app** — Ships as a native Electron app for Windows, macOS, and Linux.

---

## Quick start

```bash
npm install
npm run dev         # web dev server on localhost:5173
npm run dev:electron  # dev with desktop window
```

Open Settings (bottom-left) and paste your key from https://openrouter.ai/keys.

## Build the desktop app

```bash
npm run dist         # current OS
npm run dist:win     # Windows .exe installer
npm run dist:mac     # macOS .dmg
npm run dist:linux   # AppImage
```

Installers land in `release/`.

## How it works

- `src/lib/openrouter.ts` — thin streaming client for `POST /v1/chat/completions` (SSE) and `GET /v1/models`.
- `src/lib/models.ts` — curated featured list + per-brand colors + reasoning-capability heuristic.
- `src/lib/storage.ts` — `localStorage` persistence for chats and settings.
- `src/App.tsx` — the whole app: sidebar, chat view, compare view, settings.
- `electron/main.cjs` — Electron shell.

## Modes

| Mode     | What it does                                                                 |
|----------|------------------------------------------------------------------------------|
| Default  | Normal completion                                                            |
| Thinking | `reasoning: { effort: "high" }` — visible thinking block for capable models  |
| Fast     | `reasoning: { exclude: true }` + `provider: { sort: "throughput" }`          |
| Web      | Attaches the OpenRouter `web` plugin for live search                         |

## Notes

- The featured model list is a friendly default. The full OpenRouter catalog loads dynamically, so new releases appear automatically.
- Unsupported modes on a given model are hidden or disabled.
- Your API key is stored only in `localStorage`.
