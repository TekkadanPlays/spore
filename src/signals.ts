// ---------------------------------------------------------------------------
// Reactive state layer — Preact Signals (framework-agnostic core)
// ---------------------------------------------------------------------------

import { signal, computed, effect, batch } from '@preact/signals-core';

export { signal, computed, effect, batch };

// ---------------------------------------------------------------------------
// Endpoint definitions
// ---------------------------------------------------------------------------

export interface Endpoint {
  url: string;
  label: string;
  name: string;
  desc: string;
}

export const ENDPOINTS: Endpoint[] = [
  { url: '/api/ping',  label: 'ping',   name: 'Ping',    desc: 'Bare JSON response' },
  { url: '/api/fib',   label: 'fib(30)', name: 'Compute', desc: 'Fibonacci(30) CPU work' },
  { url: '/api/hash',  label: 'SHA-256', name: 'Encrypt', desc: 'SHA-256 crypto hash' },
];

export const BURST_SIZES = [100, 250, 500, 1000] as const;

// ---------------------------------------------------------------------------
// Benchmark state
// ---------------------------------------------------------------------------

export interface PingResult {
  id: number;
  endpoint: string;
  label: string;
  latency: number;
  serverMs?: number;
  ts: number;
}

export const results = signal<PingResult[]>([]);
export const isRunning = signal(false);
export const runningLabel = signal('');       // which endpoint is being burst
export const runningCount = signal(0);        // which burst size is active
export const burstProgress = signal(0);
export const burstTotal = signal(0);

// Page uptime timer
export const elapsed = signal(0);

// ---------------------------------------------------------------------------
// Stats helpers — can be called with any subset of results
// ---------------------------------------------------------------------------

export interface Stats {
  count: number;
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
  rps: number;
}

export function computeStats(r: PingResult[]): Stats {
  if (!r.length) return { count: 0, avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0, rps: 0 };
  const sorted = [...r].sort((a, b) => a.latency - b.latency);
  const sum = r.reduce((s, x) => s + x.latency, 0);
  const span = r.length >= 2 ? (r[r.length - 1].ts - r[0].ts) / 1000 : 0;
  return {
    count: r.length,
    avg:  +(sum / r.length).toFixed(1),
    min:  +sorted[0].latency.toFixed(1),
    max:  +sorted[sorted.length - 1].latency.toFixed(1),
    p50:  +sorted[Math.floor(sorted.length * 0.50)].latency.toFixed(1),
    p95:  +sorted[Math.floor(sorted.length * 0.95)].latency.toFixed(1),
    p99:  +sorted[Math.min(Math.floor(sorted.length * 0.99), sorted.length - 1)].latency.toFixed(1),
    rps:  span > 0 ? +((r.length / span).toFixed(0)) : 0,
  };
}

// Computed: all results stats
export const allStats = computed(() => computeStats(results.value));

// Computed: per-endpoint results
export function resultsFor(label: string): PingResult[] {
  return results.value.filter(r => r.label === label);
}

// ---------------------------------------------------------------------------
// Benchmark runner
// ---------------------------------------------------------------------------

let _nextId = 0;

async function ping(endpoint: string, label: string): Promise<PingResult> {
  const start = performance.now();
  const res = await fetch(endpoint);
  const latency = +(performance.now() - start).toFixed(1);
  const data = await res.json();
  return {
    id: _nextId++,
    endpoint,
    label,
    latency,
    serverMs: data.computeMs,
    ts: Date.now(),
  };
}

export async function singlePing(endpoint: string, label: string) {
  const r = await ping(endpoint, label);
  results.value = [...results.value, r];
  return r;
}

export async function burst(endpoint: Endpoint, count: number): Promise<Stats> {
  if (isRunning.value) return computeStats([]);
  isRunning.value = true;
  runningLabel.value = endpoint.label;
  runningCount.value = count;
  burstProgress.value = 0;
  burstTotal.value = count;

  const burstResults: PingResult[] = [];
  for (let i = 0; i < count; i++) {
    const r = await ping(endpoint.url, endpoint.label);
    burstResults.push(r);
    batch(() => {
      results.value = [...results.value, r];
      burstProgress.value = Math.round(((i + 1) / count) * 100);
    });
  }

  isRunning.value = false;
  runningLabel.value = '';
  runningCount.value = 0;
  return computeStats(burstResults);
}

export function clearResults() {
  results.value = [];
  burstProgress.value = 0;
  burstTotal.value = 0;
  runningLabel.value = '';
  _nextId = 0;
}
