# 🍄 Spore

**Build fast. Ship lean.**

A full-stack web microframework — five tools, zero bloat.

## Quick Start

```bash
bunx degit TekkadanPlays/spore my-app
cd my-app && bun install
bun run build && bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## The Stack

| Layer | Tool | Why |
|-------|------|-----|
| **Runtime** | [Bun](https://bun.sh) | Fastest JS runtime. Bundles, serves, installs — in milliseconds. |
| **Server** | [Hono](https://hono.dev) | Ultra-fast routing, middleware, and static files in 14KB. |
| **UI** | [InfernoJS](https://infernojs.org) | Fastest virtual DOM. React-compatible API at a fraction of the size. |
| **Components** | [Blazecn](https://github.com/TekkadanPlays/blazecn) | 49 shadcn/ui-compatible components — no React, no Radix. |
| **State** | [Preact Signals](https://github.com/preactjs/signals) | Fine-grained reactivity. No providers, no selectors — just `.value`. |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com) | OKLCH color system, utility-first, compiles in 56ms. |

## Project Structure

```
src/
├── server.ts         Hono server — routes, APIs, static files
├── template.ts       HTML shell with theme-flash prevention
├── signals.ts        Reactive state layer (Preact Signals)
├── styles.css        Tailwind v4 + design tokens (light/dark)
└── client/
    ├── entry.ts      Client entry — mounts Inferno
    └── App.ts        Your application
```

## Scripts

| Command | What it does |
|---------|-------------|
| `bun run dev` | Start server with file-watch restart |
| `bun run dev:css` | Watch and rebuild CSS on file changes |
| `bun run build` | Build CSS + client bundle for production |
| `bun run start` | Start production server |

## How It Works

**Server** — Hono serves an HTML shell at `GET *` and JSON APIs at `/api/*`. Static assets from `public/`.

**Client** — Bun bundles `src/client/entry.ts` into a single JS file. InfernoJS mounts your app. Blazecn provides the design system.

**State** — Preact Signals live outside the component tree. A `SignalBridge` component subscribes via `effect()` and triggers surgical Inferno re-renders:

```ts
import { signal, computed } from '@preact/signals-core';

const count = signal(0);
const doubled = computed(() => count.value * 2);

// Only re-renders this subtree when count changes:
S(() => createElement('span', null, count.value))
```

**Theming** — Light and dark mode via OKLCH design tokens in `styles.css`. The `ThemeToggle` component from Blazecn handles persistence.

## License

MIT
