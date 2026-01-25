/**
 * Voice Latency Benchmark
 * Feature: 001-mastra-agentic-voice
 * Task: T082 - Benchmark end-to-end latency
 *
 * Measures and tracks latency across the voice pipeline:
 * - Recording start latency
 * - Audio upload latency
 * - Whisper transcription latency
 * - TTS synthesis latency
 * - End-to-end voice-to-response latency
 *
 * Target: Total voice-to-voice < 3 seconds
 */

// ============================================================================
// Types
// ============================================================================

export interface LatencyMetrics {
  /** Time to start recording (microphone access) */
  recordingStartMs: number;
  /** Time to upload audio to transcription API */
  uploadMs: number;
  /** Time for Whisper transcription */
  transcriptionMs: number;
  /** Time for AI response generation */
  responseMs: number;
  /** Time for TTS synthesis */
  ttsMs: number;
  /** Total end-to-end latency */
  totalMs: number;
  /** Timestamp of measurement */
  timestamp: Date;
}

export interface LatencyBreakdown {
  phase: string;
  durationMs: number;
  percentage: number;
}

export interface LatencyReport {
  metrics: LatencyMetrics;
  breakdown: LatencyBreakdown[];
  meetsTarget: boolean;
  targetMs: number;
  suggestions: string[];
}

// ============================================================================
// Constants
// ============================================================================

// Target latency thresholds (in milliseconds)
export const LATENCY_TARGETS = {
  recordingStart: 500,    // Max time to get microphone access
  upload: 200,            // Max upload time for <100KB audio
  transcription: 1500,    // Max Whisper API latency
  response: 500,          // Max AI response time
  tts: 800,               // Max TTS synthesis time
  total: 3000,            // Total target: < 3 seconds
} as const;

// Latency status thresholds
export const LATENCY_STATUS = {
  excellent: 0.5,   // < 50% of target
  good: 0.75,       // < 75% of target
  acceptable: 1.0,  // <= 100% of target
  slow: 1.5,        // <= 150% of target
  // > 150% = critical
} as const;

// ============================================================================
// Benchmark Tracker
// ============================================================================

export class LatencyTracker {
  private startTime: number = 0;
  private phases: Map<string, { start: number; end?: number }> = new Map();
  private completed: boolean = false;

  constructor() {
    this.reset();
  }

  /**
   * Reset the tracker for a new measurement
   */
  reset(): void {
    this.startTime = performance.now();
    this.phases.clear();
    this.completed = false;
  }

  /**
   * Start tracking a phase
   */
  startPhase(phase: string): void {
    this.phases.set(phase, { start: performance.now() });
  }

  /**
   * End tracking a phase
   */
  endPhase(phase: string): number {
    const phaseData = this.phases.get(phase);
    if (!phaseData) {
      console.warn(`[LatencyTracker] Phase "${phase}" was not started`);
      return 0;
    }

    phaseData.end = performance.now();
    return phaseData.end - phaseData.start;
  }

  /**
   * Get duration of a phase
   */
  getPhaseDuration(phase: string): number {
    const phaseData = this.phases.get(phase);
    if (!phaseData) return 0;

    const end = phaseData.end ?? performance.now();
    return end - phaseData.start;
  }

  /**
   * Mark tracking as complete and get metrics
   */
  complete(): LatencyMetrics {
    this.completed = true;
    const totalMs = performance.now() - this.startTime;

    return {
      recordingStartMs: this.getPhaseDuration('recordingStart'),
      uploadMs: this.getPhaseDuration('upload'),
      transcriptionMs: this.getPhaseDuration('transcription'),
      responseMs: this.getPhaseDuration('response'),
      ttsMs: this.getPhaseDuration('tts'),
      totalMs,
      timestamp: new Date(),
    };
  }

  /**
   * Get current elapsed time without completing
   */
  getElapsed(): number {
    return performance.now() - this.startTime;
  }
}

// ============================================================================
// Analysis Functions
// ============================================================================

/**
 * Analyze latency metrics and generate a report
 */
export function analyzeLatency(metrics: LatencyMetrics): LatencyReport {
  // Guard against division by zero if totalMs is 0
  const safeTotalMs = metrics.totalMs > 0 ? metrics.totalMs : 1;

  const breakdown: LatencyBreakdown[] = [
    {
      phase: 'Recording Start',
      durationMs: metrics.recordingStartMs,
      percentage: (metrics.recordingStartMs / safeTotalMs) * 100,
    },
    {
      phase: 'Upload',
      durationMs: metrics.uploadMs,
      percentage: (metrics.uploadMs / safeTotalMs) * 100,
    },
    {
      phase: 'Transcription',
      durationMs: metrics.transcriptionMs,
      percentage: (metrics.transcriptionMs / safeTotalMs) * 100,
    },
    {
      phase: 'AI Response',
      durationMs: metrics.responseMs,
      percentage: (metrics.responseMs / safeTotalMs) * 100,
    },
    {
      phase: 'TTS Synthesis',
      durationMs: metrics.ttsMs,
      percentage: (metrics.ttsMs / safeTotalMs) * 100,
    },
  ];

  const suggestions: string[] = [];

  // Check each phase against targets
  if (metrics.recordingStartMs > LATENCY_TARGETS.recordingStart) {
    suggestions.push('Microphone access slow - check browser permissions caching');
  }
  if (metrics.uploadMs > LATENCY_TARGETS.upload) {
    suggestions.push('Upload slow - consider further audio compression');
  }
  if (metrics.transcriptionMs > LATENCY_TARGETS.transcription) {
    suggestions.push('Transcription slow - check Whisper API region or use streaming');
  }
  if (metrics.responseMs > LATENCY_TARGETS.response) {
    suggestions.push('AI response slow - consider response streaming');
  }
  if (metrics.ttsMs > LATENCY_TARGETS.tts) {
    suggestions.push('TTS slow - use TTS caching for common phrases');
  }

  const meetsTarget = metrics.totalMs <= LATENCY_TARGETS.total;

  if (meetsTarget) {
    suggestions.unshift('✓ Total latency within target');
  } else {
    suggestions.unshift(`✗ Total latency ${Math.round(metrics.totalMs)}ms exceeds ${LATENCY_TARGETS.total}ms target`);
  }

  return {
    metrics,
    breakdown,
    meetsTarget,
    targetMs: LATENCY_TARGETS.total,
    suggestions,
  };
}

/**
 * Get latency status for a value against a target
 */
export function getLatencyStatus(valueMs: number, targetMs: number): 'excellent' | 'good' | 'acceptable' | 'slow' | 'critical' {
  // Guard against division by zero
  if (targetMs <= 0) {
    return valueMs <= 0 ? 'excellent' : 'critical';
  }
  const ratio = valueMs / targetMs;

  if (ratio < LATENCY_STATUS.excellent) return 'excellent';
  if (ratio < LATENCY_STATUS.good) return 'good';
  if (ratio <= LATENCY_STATUS.acceptable) return 'acceptable';
  if (ratio <= LATENCY_STATUS.slow) return 'slow';
  return 'critical';
}

/**
 * Format latency for display
 */
export function formatLatency(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

// ============================================================================
// Aggregation
// ============================================================================

/**
 * Calculate average latency from multiple measurements
 */
export function calculateAverageLatency(measurements: LatencyMetrics[]): LatencyMetrics {
  if (measurements.length === 0) {
    return {
      recordingStartMs: 0,
      uploadMs: 0,
      transcriptionMs: 0,
      responseMs: 0,
      ttsMs: 0,
      totalMs: 0,
      timestamp: new Date(),
    };
  }

  const sum = measurements.reduce((acc, m) => ({
    recordingStartMs: acc.recordingStartMs + m.recordingStartMs,
    uploadMs: acc.uploadMs + m.uploadMs,
    transcriptionMs: acc.transcriptionMs + m.transcriptionMs,
    responseMs: acc.responseMs + m.responseMs,
    ttsMs: acc.ttsMs + m.ttsMs,
    totalMs: acc.totalMs + m.totalMs,
    timestamp: new Date(),
  }), {
    recordingStartMs: 0,
    uploadMs: 0,
    transcriptionMs: 0,
    responseMs: 0,
    ttsMs: 0,
    totalMs: 0,
    timestamp: new Date(),
  });

  const count = measurements.length;

  return {
    recordingStartMs: sum.recordingStartMs / count,
    uploadMs: sum.uploadMs / count,
    transcriptionMs: sum.transcriptionMs / count,
    responseMs: sum.responseMs / count,
    ttsMs: sum.ttsMs / count,
    totalMs: sum.totalMs / count,
    timestamp: new Date(),
  };
}

/**
 * Calculate percentile latency (p50, p90, p95, p99)
 */
export function calculatePercentileLatency(
  measurements: LatencyMetrics[],
  percentile: number
): number {
  if (measurements.length === 0) return 0;

  const sorted = [...measurements].sort((a, b) => a.totalMs - b.totalMs);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;

  return sorted[Math.max(0, Math.min(index, sorted.length - 1))].totalMs;
}

// ============================================================================
// Logging
// ============================================================================

/**
 * Log latency report to console (development only)
 */
export function logLatencyReport(report: LatencyReport): void {
  if (process.env.NODE_ENV !== 'development') return;

  console.group('[Voice Latency Report]');
  console.log(`Total: ${formatLatency(report.metrics.totalMs)} (target: ${formatLatency(report.targetMs)})`);
  console.log(`Status: ${report.meetsTarget ? '✓ PASS' : '✗ FAIL'}`);

  console.group('Breakdown:');
  report.breakdown.forEach((phase) => {
    const status = getLatencyStatus(
      phase.durationMs,
      LATENCY_TARGETS[phase.phase.toLowerCase().replace(' ', '') as keyof typeof LATENCY_TARGETS] || 1000
    );
    console.log(`  ${phase.phase}: ${formatLatency(phase.durationMs)} (${phase.percentage.toFixed(1)}%) [${status}]`);
  });
  console.groupEnd();

  if (report.suggestions.length > 0) {
    console.group('Suggestions:');
    report.suggestions.forEach((s) => console.log(`  ${s}`));
    console.groupEnd();
  }

  console.groupEnd();
}
