// Lightweight fetch wrapper with timeout, retry (for transient errors),
// and a simple global concurrency limiter to prevent request storms.

type RetryOptions = {
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayBaseMs?: number;
  retryOnStatus?: number[]; // HTTP status codes to retry
  slowThresholdMs?: number; // log warning when slower than this
};

const DEFAULTS: Required<RetryOptions> = {
  timeoutMs: 11000,
  maxRetries: 2,
  retryDelayBaseMs: 300,
  retryOnStatus: [408, 429, 500, 502, 503, 504],
  slowThresholdMs: 1500,
};

// Simple semaphore for concurrency limiting
class Semaphore {
  private queue: Array<() => void> = [];
  private active = 0;
  constructor(private max: number) {}
  async acquire(): Promise<() => void> {
    if (this.active < this.max) {
      this.active++;
      return () => this.release();
    }
    return new Promise<() => void>((resolve) => {
      this.queue.push(() => {
        this.active++;
        resolve(() => this.release());
      });
    });
  }
  private release() {
    this.active--;
    const next = this.queue.shift();
    if (next) next();
  }
}

// Limit concurrent network requests (tune as needed)
const globalSemaphore = new Semaphore(6);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isIdempotent(method?: string) {
  const m = (method || 'GET').toUpperCase();
  return m === 'GET' || m === 'HEAD' || m === 'OPTIONS';
}

export async function fetchWithControls(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const opts = { ...DEFAULTS };
  const release = await globalSemaphore.acquire();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs);
  const start = Date.now();

  // Ensure signal propagation
  const mergedInit: RequestInit = {
    ...init,
    signal: init?.signal ? (mergeSignals(init.signal, controller.signal)) : controller.signal,
    // Force no-cache for auth endpoints that are sensitive to caching proxies (belt and suspenders)
    cache: init?.cache ?? 'no-store',
  };

  const url = typeof input === 'string' ? input : (input as URL).toString();
  const method = (mergedInit.method || 'GET').toUpperCase();
  const shouldRetry = isIdempotent(method);

  let attempt = 0;
  // We will retry network errors or configured HTTP statuses (idempotent requests only)
  while (true) {
    try {
      const res = await (globalThis.fetch as typeof fetch)(input, mergedInit);
      const duration = Date.now() - start;
      if (duration > opts.slowThresholdMs) {
        // eslint-disable-next-line no-console
        console.warn(`[net] Slow ${method} ${shorten(url)} ${duration}ms`);
      }
      if (!res.ok && shouldRetry && opts.retryOnStatus.includes(res.status) && attempt < opts.maxRetries) {
        attempt++;
        const backoff = opts.retryDelayBaseMs * Math.pow(2, attempt - 1);
        // eslint-disable-next-line no-console
        console.warn(`[net] Retry ${attempt}/${opts.maxRetries} ${method} ${shorten(url)} after status ${res.status}`);
        await sleep(backoff);
        continue;
      }
      release();
      return res;
    } catch (err: any) {
      // AbortError or transient network error
      if (shouldRetry && attempt < opts.maxRetries && (err?.name === 'AbortError' || err?.code === 'ECONNRESET' || err?.message?.includes('NetworkError'))) {
        attempt++;
        const backoff = opts.retryDelayBaseMs * Math.pow(2, attempt - 1);
        // eslint-disable-next-line no-console
        console.warn(`[net] Retry ${attempt}/${opts.maxRetries} ${method} ${shorten(url)} after error: ${err?.name || err}`);
        await sleep(backoff);
        continue;
      }
      release();
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  // Utility: merge two AbortSignals into one
  function mergeSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
    if ((a as any) === (b as any)) return a;
    const ctrl = new AbortController();
    const onAbortA = () => ctrl.abort((a as any).reason);
    const onAbortB = () => ctrl.abort((b as any).reason);
    if (a.aborted) ctrl.abort((a as any).reason);
    else a.addEventListener('abort', onAbortA, { once: true } as any);
    if (b.aborted) ctrl.abort((b as any).reason);
    else b.addEventListener('abort', onAbortB, { once: true } as any);
    // Best-effort cleanup once aborted
    (ctrl.signal as any).addEventListener('abort', () => {
      a.removeEventListener('abort', onAbortA as any);
      b.removeEventListener('abort', onAbortB as any);
    }, { once: true } as any);
    return ctrl.signal;
  }

  function shorten(u: string) {
    try {
      const parsed = new URL(u as any, window.location.origin);
      const path = parsed.pathname + (parsed.search ? '?' + parsed.search.slice(1, 40) + (parsed.search.length > 40 ? '…' : '') : '');
      return parsed.hostname.replace(/^([a-z0-9-]){3,}\./, '…') + path;
    } catch {
      return u as string;
    }
  }
}

export default fetchWithControls;
