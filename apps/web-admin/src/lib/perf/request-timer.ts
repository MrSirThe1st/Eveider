export interface PerfTimer {
  measure<T>(label: string, fn: () => Promise<T>): Promise<T>;
  flush(status?: number): void;
}

const noopTimer: PerfTimer = {
  measure: (_label, fn) => fn(),
  flush: () => {},
};

function isPerfEnabled() {
  return process.env.NODE_ENV === 'development' || process.env.PERF_LOG === '1';
}

class DevRequestTimer implements PerfTimer {
  private readonly startedAt = performance.now();
  private readonly segments: { label: string; ms: number }[] = [];

  constructor(private readonly route: string) {}

  async measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const segmentStart = performance.now();
    try {
      return await fn();
    } finally {
      this.segments.push({ label, ms: Math.round(performance.now() - segmentStart) });
    }
  }

  flush(status?: number) {
    const wallMs = Math.round(performance.now() - this.startedAt);
    const segmentTotal = this.segments.reduce((sum, segment) => sum + segment.ms, 0);
    const statusSuffix = status !== undefined ? ` ${status}` : '';

    console.log(`[perf] ${this.route}${statusSuffix} — wall ${wallMs}ms`);
    for (const segment of this.segments) {
      console.log(`  ${segment.label.padEnd(26)} ${String(segment.ms).padStart(5)}ms`);
    }
    if (this.segments.length > 1) {
      console.log(`  ${'Σ segments'.padEnd(26)} ${String(segmentTotal).padStart(5)}ms`);
    }
  }
}

/** Dev-only request timer. No-op in production unless PERF_LOG=1. */
export function createRequestTimer(route: string): PerfTimer {
  if (!isPerfEnabled()) return noopTimer;
  return new DevRequestTimer(route);
}
