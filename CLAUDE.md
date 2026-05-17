# CLAUDE.md — Рабочие конвенции проекта Italian Tutor

## Источник истины

**Читай `PROJECT.md` в начале каждой сессии.** Там задокументированы все принятые технические решения, стек, модель данных, архитектура. Не принимай архитектурные решения, противоречащие PROJECT.md, без явного согласия.

---

## Компоненты: Server vs Client

- **Server Components по умолчанию.** Если компонент не требует хуков или браузерных API — он серверный.
- **`'use client'` только когда нужно:** хуки React (`useState`, `useEffect`, `useRef`), браузерные API (`MediaRecorder`, `window`, `navigator`), обработчики событий на клиенте.
- Не добавляй `'use client'` «на всякий случай».

---

## Безопасность: AI API keys

- **Все вызовы внешних AI-сервисов (OpenAI Whisper, GPT-4o, ElevenLabs, Anthropic Claude) идут только через Next.js API routes** (`src/app/api/...`).
- Секретные ключи (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `SUPABASE_SECRET_KEY`) **никогда не уходят на клиент**.
- Переменные без `NEXT_PUBLIC_` префикса доступны только на сервере — так и оставляй.

---

## Supabase

### Переменные окружения

| Переменная | Где использовать |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Клиент и сервер |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Только клиент (безопасно) |
| `SUPABASE_SECRET_KEY` | Только сервер — обходит RLS |

### Паттерн `@supabase/ssr`

- Для Server Components и Route Handlers — используй `@supabase/ssr` через хелперы в `src/lib/supabase/`.
- Клиентский Supabase-клиент создаётся через `createBrowserClient`.
- Серверный — через `createServerClient` с cookies из `next/headers`.

---

## Команды

```bash
npm run dev      # dev server на localhost:3000
npm run build    # production build
npm run lint     # ESLint
```

---

## Что никогда не делать

- **Не коммитить `.env.local`** — он в `.gitignore`, пусть там и остаётся.
- Не класть секретные ключи в код, комментарии или логи.
- Не передавать `SUPABASE_SECRET_KEY` или AI API keys в клиентский код.
