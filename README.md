# OpenRouter Chat

A beautiful, minimal desktop chat app for every top LLM, powered by [OpenRouter](https://openrouter.ai).
One interface. Every model. Side-by-side compare.

## Download

**→ [Download for Windows](https://github.com/gorarakelyanf/openrouter-chat/releases/latest)**

Download `OpenRouter-Chat-Setup.exe`, double-click, done. No admin required.

> Windows SmartScreen may warn on first launch because the installer isn't code-signed (signing costs money). Click **More info → Run anyway**.

## What's inside

- **Every top model, one interface** — GPT-5, GLM, Kimi, Gemini 3 Flash, Qwen Max, Grok.
- **Live streaming** — responses stream in real time with visible reasoning for thinking models.
- **Compare mode** — run the same prompt across 2–4 models side-by-side, all streaming at once.
- **Local-first** — chats and your API key live only in your app's storage. No server. No tracking.
- **Fast** — memoized markdown, shallow scroll preservation, smooth at 100+ messages.

## Setup (30 seconds)

1. Grab a free key at [openrouter.ai/keys](https://openrouter.ai/keys)
2. Open the app → click **Settings** (bottom-left)
3. Paste your key, hit **Save**
4. Pick a model from the top bar and start typing

That's it.

## Building from source

```bash
git clone https://github.com/gorarakelyanf/openrouter-chat.git
cd openrouter-chat
npm install
npm run dev:electron       # run in dev mode
npm run dist:win           # build Windows installer → ./release/
npm run dist:mac           # macOS .dmg
npm run dist:linux         # AppImage
```

## Stack

React 18 · TypeScript · Vite · Tailwind · Electron · OpenRouter SSE streaming

## License

MIT
