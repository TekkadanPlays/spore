import { Component } from 'inferno';
import { createElement } from 'inferno-create-element';
import { effect } from '@preact/signals-core';
import {
  elapsed,
  results, isRunning, runningLabel, runningCount, burstProgress, burstTotal,
  allStats, computeStats, resultsFor,
  ENDPOINTS, BURST_SIZES,
  singlePing, burst, clearResults,
  type Endpoint,
} from '../signals';
import {
  Button, Badge, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
  ThemeToggle, ThemeSelector,
  Toaster, toast,
  initTheme,
} from 'blazecn';
import { LatencyChart } from './LatencyChart';

// ---------------------------------------------------------------------------
// SignalBridge — bridges @preact/signals-core reactivity into Inferno
// ---------------------------------------------------------------------------

class SignalBridge extends Component<{ children: () => any }, {}> {
  private dispose: (() => void) | null = null;
  private _mounted = false;

  componentDidMount() {
    this._mounted = true;
    this.dispose = effect(() => {
      this.props.children();
      if (this._mounted) this.forceUpdate();
    });
  }

  componentWillUnmount() {
    this._mounted = false;
    this.dispose?.();
  }

  render() {
    return this.props.children();
  }
}

function S(fn: () => any) {
  return createElement(SignalBridge, { children: fn });
}

// ---------------------------------------------------------------------------
// SVG icon helpers (inline, no dependency)
// ---------------------------------------------------------------------------

function Icon(path: string, cls = 'size-5') {
  return createElement('svg', {
    className: cls,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '1.5',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  }, createElement('path', { d: path }));
}

const IconZap = () => Icon('M13 2L3 14h9l-1 8 10-12h-9l1-8');
const IconLayers = () => Icon('m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.84ZM22 17.65l-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65M22 12.65l-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65');
const IconGauge = () => Icon('M12 16.5V9.5M12 16.5 7.5 21M12 16.5 16.5 21M3 12a9 9 0 0 1 18 0');
const IconTerminal = () => Icon('m4 17 6-6-6-6M12 19h8');
const IconPalette = () => Icon('M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.8-.1 2.6-.4.8-.3.6-1.6-.3-1.6h-1.3c-1 0-1.9-.6-2.3-1.5-.4-.9-.2-1.9.5-2.6L15 12l-3-3-3 3');
const IconPackage = () => Icon('m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z M3.3 7l8.7 5 8.7-5M12 22V12');

// ---------------------------------------------------------------------------
// Inline stat: "3.2ms" style
// ---------------------------------------------------------------------------

function Stat(value: string, unit: string) {
  return createElement('span', { className: 'tabular-nums' },
    value,
    unit ? createElement('span', { className: 'text-muted-foreground ml-px' }, unit) : null,
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export class App extends Component<{}, {}> {
  private _timerId: ReturnType<typeof setInterval> | null = null;

  componentDidMount() {
    initTheme();
    this._timerId = setInterval(() => { elapsed.value += 1; }, 1000);
  }

  componentWillUnmount() {
    if (this._timerId) clearInterval(this._timerId);
  }

  private async runBurst(ep: Endpoint, count: number) {
    const stats = await burst(ep, count);
    toast.success(`${ep.name} \u00D7${count}: ${stats.avg}ms avg`);
  }

  // =====================================================================
  // RENDER
  // =====================================================================

  render() {
    return createElement('div', { className: 'min-h-screen bg-background text-foreground' },
      createElement(Toaster, { position: 'bottom-right' }),

      // NAV
      createElement('nav', {
        className: 'fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md',
      },
        createElement('div', { className: 'mx-auto flex h-14 max-w-6xl items-center justify-between px-6' },
          createElement('div', { className: 'flex items-center gap-2.5' },
            createElement('div', {
              className: 'size-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold',
            }, '\u{1F344}'),
            createElement('span', { className: 'font-semibold text-base tracking-tight' }, 'Spore'),
          ),
          createElement('div', { className: 'flex items-center gap-3' },
            createElement('div', { className: 'hidden sm:flex items-center gap-1.5' },
              ...['Bun', 'Hono', 'Inferno', 'Signals'].map((t) =>
                createElement('span', {
                  className: 'text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full',
                }, t),
              ),
            ),
            createElement(ThemeSelector, null),
            createElement(ThemeToggle, null),
          ),
        ),
      ),

      // HERO
      createElement('div', { className: 'pt-14' },
        createElement('header', { className: 'relative overflow-hidden' },
          createElement('div', { className: 'absolute inset-0 overflow-hidden pointer-events-none' },
            createElement('div', {
              className: 'absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-20 blur-3xl',
              style: { background: 'oklch(0.68 0.19 150)' },
            }),
            createElement('div', {
              className: 'absolute -bottom-24 -right-24 w-96 h-96 rounded-full opacity-10 blur-3xl',
              style: { background: 'oklch(0.68 0.15 200)' },
            }),
          ),
          createElement('div', { className: 'relative mx-auto max-w-6xl px-6 py-24 md:py-32' },
            createElement('div', { className: 'max-w-3xl' },
              createElement(Badge, { variant: 'secondary', className: 'mb-6' }, 'v0.1 \u2014 Developer Preview'),
              createElement('h1', {
                className: 'text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6',
              },
                'Build ',
                createElement('span', { style: { color: 'oklch(0.68 0.19 150)' } }, 'fast'),
                '.',
                createElement('br', null),
                'Ship ',
                createElement('span', { style: { color: 'oklch(0.68 0.19 150)' } }, 'lean'),
                '.',
              ),
              createElement('p', {
                className: 'text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mb-10',
              }, 'Five tools. No bloat. Bun for the runtime. Hono for the server. InfernoJS for the UI. Blazecn for the components. Signals for the state. Everything you need. Nothing you don\'t.'),
              createElement('div', { className: 'flex flex-wrap items-center gap-3' },
                createElement(Button, {
                  size: 'lg',
                  onClick: () => { const el = document.getElementById('bench'); if (el) el.scrollIntoView({ behavior: 'smooth' }); },
                }, 'Try it live \u2193'),
                createElement(Button, {
                  variant: 'outline', size: 'lg',
                  onClick: () => {
                    this.runBurst(ENDPOINTS[0], 100);
                    const el = document.getElementById('bench');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  },
                }, 'Run a speed test'),
              ),
            ),
          ),
        ),
      ),

      // STATS RIBBON
      createElement('div', { className: 'border-y bg-muted/30' },
        createElement('div', { className: 'mx-auto max-w-6xl px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-6' },
          ...[
            { value: '261 KB', label: 'Client JS', sub: 'minified, incl. Chart.js' },
            { value: '49+', label: 'Components', sub: 'Blazecn' },
            { value: '60ms', label: 'CSS build', sub: 'Tailwind v4' },
            { value: '0', label: 'React deps', sub: 'ever' },
          ].map((s) =>
            createElement('div', { className: 'text-center' },
              createElement('div', { className: 'text-2xl md:text-3xl font-bold tracking-tight' }, s.value),
              createElement('div', { className: 'text-sm text-muted-foreground' }, s.label),
              createElement('div', { className: 'text-xs text-muted-foreground/60' }, s.sub),
            ),
          ),
        ),
      ),

      // ================================================================
      // BENCHMARK TOOL — single cohesive section, no tabs
      // ================================================================
      createElement('main', { className: 'mx-auto max-w-6xl px-6 py-16', id: 'bench' },
        createElement('div', { className: 'text-center mb-10' },
          createElement('h2', { className: 'text-3xl font-bold tracking-tight mb-3' }, 'Benchmark'),
          createElement('p', { className: 'text-muted-foreground max-w-xl mx-auto' },
            'Send real HTTP requests to the Bun/Hono server. Choose an endpoint, pick a burst size, and watch the results stream in.',
          ),
        ),

        createElement('div', { className: 'space-y-6' },

          // ---- Dense control table ----
          createElement(Card, null,
            createElement(CardContent, { className: 'p-0' },
              // Header row
              createElement('div', { className: 'grid grid-cols-[1fr_auto_auto] items-center gap-x-3 px-3 py-1.5 border-b text-[10px] font-medium text-muted-foreground uppercase tracking-wider' },
                createElement('span', null, 'Endpoint'),
                createElement('span', { className: 'text-right' }, 'Stats'),
                createElement('span', { className: 'text-right' }, 'Burst'),
              ),
              // One tight row per endpoint
              ...ENDPOINTS.map((ep, idx) =>
                createElement('div', {
                  className: `grid grid-cols-[1fr_auto_auto] items-center gap-x-3 px-3 py-2 ${idx > 0 ? 'border-t border-border/50' : ''}`,
                },
                  // Col 1: Name + single ping
                  createElement('div', { className: 'flex items-center gap-2 min-w-0' },
                    createElement(Button, {
                      variant: 'ghost', size: 'sm', className: 'h-6 px-1.5 text-[11px] shrink-0',
                      onClick: () => singlePing(ep.url, ep.label),
                    }, '\u25B6'),
                    createElement('div', { className: 'min-w-0' },
                      createElement('div', { className: 'text-sm font-medium leading-tight' }, ep.name),
                      createElement('div', { className: 'text-[10px] text-muted-foreground leading-tight truncate' }, ep.desc),
                    ),
                  ),
                  // Col 2: Inline stats
                  S(() => {
                    const st = computeStats(resultsFor(ep.label));
                    const h = st.count > 0;
                    return createElement('div', { className: 'text-[11px] text-right tabular-nums whitespace-nowrap leading-tight' },
                      h
                        ? createElement('span', null,
                            createElement('span', { className: 'text-foreground font-medium' }, `${st.avg}`),
                            createElement('span', { className: 'text-muted-foreground' }, 'ms avg '),
                            createElement('span', { className: 'text-muted-foreground' }, `(${st.count})`),
                          )
                        : createElement('span', { className: 'text-muted-foreground' }, '\u2014'),
                    );
                  }),
                  // Col 3: Burst buttons — fixed width so spinner doesn't shift layout
                  createElement('div', { className: 'flex items-center gap-0.5 shrink-0' },
                    ...BURST_SIZES.map((n) =>
                      S(() => {
                        const thisActive = isRunning.value && runningLabel.value === ep.label && runningCount.value === n;
                        return createElement(Button, {
                          size: 'sm',
                          variant: 'ghost',
                          disabled: isRunning.value,
                          onClick: () => this.runBurst(ep, n),
                          className: `h-6 text-[11px] tabular-nums ${n >= 1000 ? 'w-10' : 'w-8'} px-0 justify-center`,
                        },
                          thisActive
                            ? `${burstProgress.value}%`
                            : String(n),
                        );
                      }),
                    ),
                  ),
                ),
              ),
            ),
          ),

          // ---- Global summary + reset ----
          S(() => {
            const st = allStats.value;
            return createElement('div', { className: 'flex items-center justify-between text-[11px] text-muted-foreground tabular-nums' },
              st.count > 0
                ? createElement('span', null, `${st.count} reqs \u00B7 ${st.avg}ms avg \u00B7 p99 ${st.p99}ms \u00B7 ${st.rps} req/s`)
                : createElement('span', null, 'No requests yet'),
              st.count > 0
                ? createElement(Button, {
                    variant: 'ghost', size: 'sm', className: 'h-6 text-[11px]',
                    onClick: () => { clearResults(); toast('Cleared'); },
                  }, 'Reset')
                : null,
            );
          }),

          // ---- Visualization ----
          createElement(Card, null,
            createElement(CardContent, { className: 'pt-4 pb-3 space-y-3' },
              createElement(LatencyChart, null),
              // Percentile badges via SignalBridge (no chart jitter)
              S(() => {
                const st = allStats.value;
                const has = st.count > 0;
                const pills = [
                  { k: 'p50', v: st.p50, l: 'p50' },
                  { k: 'p95', v: st.p95, l: 'p95' },
                  { k: 'p99', v: st.p99, l: 'p99' },
                  { k: 'max', v: st.max, l: 'max' },
                ];
                return createElement('div', { className: 'grid grid-cols-4 gap-1.5' },
                  ...pills.map((p) => {
                    const hot = has && (p.k === 'max' || (p.k === 'p99' && p.v > 25));
                    return createElement('div', {
                      className: `rounded border px-1.5 py-1.5 text-center ${hot ? 'border-destructive/40 bg-destructive/5' : 'bg-muted/30'}`,
                    },
                      createElement('div', {
                        className: `text-sm font-bold tabular-nums ${hot ? 'text-destructive' : ''}`,
                      }, has ? `${p.v}ms` : '\u2014'),
                      createElement('div', { className: 'text-[9px] text-muted-foreground' }, p.l),
                    );
                  }),
                );
              }),
            ),
          ),
        ),
      ),

      // THE STACK
      createElement('div', { className: 'border-t bg-muted/20' },
        createElement('div', { className: 'mx-auto max-w-6xl px-6 py-20' },
          createElement('div', { className: 'text-center mb-12' },
            createElement('h2', { className: 'text-3xl font-bold tracking-tight mb-3' }, 'The Stack'),
            createElement('p', { className: 'text-muted-foreground max-w-lg mx-auto' },
              'Six layers, each best-in-class. No redundancy. No compromise.',
            ),
          ),
          createElement('div', { className: 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' },
            ...[
              { icon: IconZap, name: 'Bun', desc: 'Runtime, bundler, package manager. Starts in milliseconds. Builds in milliseconds.' },
              { icon: IconTerminal, name: 'Hono', desc: 'Ultra-fast web framework. Routes, middleware, static files \u2014 14KB total.' },
              { icon: IconGauge, name: 'InfernoJS', desc: 'The fastest virtual DOM. React-compatible API at 1/5th the size.' },
              { icon: IconPackage, name: 'Blazecn', desc: '49+ accessible components. shadcn design language, zero React dependency.' },
              { icon: IconLayers, name: 'Preact Signals', desc: 'Fine-grained reactivity. No context, no selectors \u2014 just .value.' },
              { icon: IconPalette, name: 'Tailwind v4', desc: 'OKLCH color system, 20 themes, utility CSS that compiles in 56ms.' },
            ].map((item) =>
              createElement(Card, { className: 'group hover:border-primary/30 transition-colors' },
                createElement(CardHeader, null,
                  createElement('div', { className: 'flex items-center gap-3' },
                    createElement('div', {
                      className: 'size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary/20 transition-colors',
                    }, createElement(item.icon, null)),
                    createElement(CardTitle, null, item.name),
                  ),
                ),
                createElement(CardContent, null,
                  createElement('p', { className: 'text-sm text-muted-foreground leading-relaxed' }, item.desc),
                ),
              ),
            ),
          ),
        ),
      ),

      // QUICKSTART
      createElement('div', { className: 'border-t' },
        createElement('div', { className: 'mx-auto max-w-6xl px-6 py-20' },
          createElement('div', { className: 'text-center mb-12' },
            createElement('h2', { className: 'text-3xl font-bold tracking-tight mb-3' }, 'Get started in seconds'),
            createElement('p', { className: 'text-muted-foreground' }, 'Three commands. That\u2019s it.'),
          ),
          createElement('div', { className: 'max-w-xl mx-auto' },
            createElement('div', { className: 'rounded-xl border bg-card overflow-hidden shadow-sm' },
              createElement('div', { className: 'flex items-center gap-2 px-4 py-2.5 border-b bg-muted/30' },
                createElement('div', { className: 'size-3 rounded-full bg-destructive/60' }),
                createElement('div', { className: 'size-3 rounded-full bg-yellow-500/60' }),
                createElement('div', { className: 'size-3 rounded-full bg-primary/60' }),
                createElement('span', { className: 'ml-2 text-xs text-muted-foreground font-mono' }, 'terminal'),
              ),
              createElement('div', { className: 'p-5 font-mono text-sm leading-relaxed space-y-1' },
                createElement('div', null,
                  createElement('span', { className: 'text-muted-foreground' }, '$ '),
                  'bunx degit TekkadanPlays/spore my-app',
                ),
                createElement('div', null,
                  createElement('span', { className: 'text-muted-foreground' }, '$ '),
                  'cd my-app && bun install',
                ),
                createElement('div', null,
                  createElement('span', { className: 'text-muted-foreground' }, '$ '),
                  'bun run build && bun run dev',
                ),
                createElement('div', { className: 'pt-2 text-muted-foreground' }, '\u{1F344} Spore is alive on http://localhost:3000'),
              ),
            ),
          ),
        ),
      ),

      // FOOTER
      createElement('footer', { className: 'border-t' },
        createElement('div', { className: 'mx-auto max-w-6xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4' },
          createElement('div', { className: 'flex items-center gap-2 text-sm text-muted-foreground' },
            '\u{1F344}', ' Spore v0.1', ' \u00B7 ', 'MIT License',
          ),
          createElement('div', { className: 'flex items-center gap-1.5 text-xs text-muted-foreground' },
            ...['Bun', 'Hono', 'InfernoJS', 'Blazecn', 'Signals', 'Tailwind'].map((t, i) =>
              createElement('span', null, i > 0 ? ' + ' : '', createElement('strong', { className: 'text-foreground/70' }, t)),
            ),
          ),
        ),
      ),
    );
  }
}
