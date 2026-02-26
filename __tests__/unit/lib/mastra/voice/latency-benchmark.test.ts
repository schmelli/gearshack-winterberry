/**
 * Latency Benchmark Tests
 * Feature: 001-mastra-agentic-voice
 * Task: T082 - Benchmark end-to-end latency
 *
 * Tests for voice latency measurement and analysis:
 * - LatencyTracker class for phase-based tracking
 * - analyzeLatency for generating reports
 * - getLatencyStatus for threshold classification
 * - formatLatency for display formatting
 * - calculateAverageLatency for aggregation
 * - calculatePercentileLatency for percentile calculations
 * - logLatencyReport for development logging
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  LatencyTracker,
  analyzeLatency,
  getLatencyStatus,
  formatLatency,
  calculateAverageLatency,
  calculatePercentileLatency,
  logLatencyReport,
  LATENCY_TARGETS,
  LATENCY_STATUS,
  type LatencyMetrics,
  type LatencyReport,
} from '@/lib/mastra/voice/latency-benchmark';

// =============================================================================
// Mocks
// =============================================================================

// Mock performance.now() for consistent timing
let mockNow = 0;
const originalPerformanceNow = performance.now;

beforeEach(() => {
  mockNow = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => mockNow);
});

afterEach(() => {
  vi.restoreAllMocks();
  performance.now = originalPerformanceNow;
});

// Helper to advance mock time
function advanceTime(ms: number): void {
  mockNow += ms;
}

// =============================================================================
// LATENCY_TARGETS Tests
// =============================================================================

describe('LATENCY_TARGETS', () => {
  it('should have correct target values', () => {
    expect(LATENCY_TARGETS.recordingStart).toBe(500);
    expect(LATENCY_TARGETS.upload).toBe(200);
    expect(LATENCY_TARGETS.transcription).toBe(1500);
    expect(LATENCY_TARGETS.response).toBe(500);
    expect(LATENCY_TARGETS.tts).toBe(800);
    expect(LATENCY_TARGETS.total).toBe(3000);
  });

  it('should have total target of 3 seconds', () => {
    expect(LATENCY_TARGETS.total).toBe(3000);
  });
});

// =============================================================================
// LATENCY_STATUS Tests
// =============================================================================

describe('LATENCY_STATUS', () => {
  it('should have correct threshold ratios', () => {
    expect(LATENCY_STATUS.excellent).toBe(0.5);
    expect(LATENCY_STATUS.good).toBe(0.75);
    expect(LATENCY_STATUS.acceptable).toBe(1.0);
    expect(LATENCY_STATUS.slow).toBe(1.5);
  });
});

// =============================================================================
// LatencyTracker Tests
// =============================================================================

describe('LatencyTracker', () => {
  describe('Constructor and Reset', () => {
    it('should initialize with start time', () => {
      mockNow = 1000;
      const tracker = new LatencyTracker();

      advanceTime(100);
      expect(tracker.getElapsed()).toBe(100);
    });

    it('should reset all tracking state', () => {
      const tracker = new LatencyTracker();

      tracker.startPhase('test');
      advanceTime(100);
      tracker.endPhase('test');

      advanceTime(50);
      tracker.reset();

      // After reset, elapsed should be 0 (relative to new start)
      expect(tracker.getElapsed()).toBe(0);
      expect(tracker.getPhaseDuration('test')).toBe(0);
    });
  });

  describe('Phase Tracking', () => {
    it('should track a single phase', () => {
      const tracker = new LatencyTracker();

      tracker.startPhase('upload');
      advanceTime(150);
      const duration = tracker.endPhase('upload');

      expect(duration).toBe(150);
    });

    it('should track multiple phases', () => {
      const tracker = new LatencyTracker();

      tracker.startPhase('recordingStart');
      advanceTime(200);
      tracker.endPhase('recordingStart');

      tracker.startPhase('upload');
      advanceTime(100);
      tracker.endPhase('upload');

      tracker.startPhase('transcription');
      advanceTime(1000);
      tracker.endPhase('transcription');

      expect(tracker.getPhaseDuration('recordingStart')).toBe(200);
      expect(tracker.getPhaseDuration('upload')).toBe(100);
      expect(tracker.getPhaseDuration('transcription')).toBe(1000);
    });

    it('should return 0 for unstarted phase', () => {
      const tracker = new LatencyTracker();
      expect(tracker.getPhaseDuration('nonexistent')).toBe(0);
    });

    it('should warn and return 0 when ending unstarted phase', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const tracker = new LatencyTracker();

      const duration = tracker.endPhase('nonexistent');

      expect(duration).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[LatencyTracker] Phase "nonexistent" was not started'
      );
    });

    it('should get duration of ongoing phase', () => {
      const tracker = new LatencyTracker();

      tracker.startPhase('ongoing');
      advanceTime(250);

      // Phase not ended yet
      expect(tracker.getPhaseDuration('ongoing')).toBe(250);

      advanceTime(100);
      expect(tracker.getPhaseDuration('ongoing')).toBe(350);
    });
  });

  describe('getElapsed', () => {
    it('should return elapsed time from start', () => {
      const tracker = new LatencyTracker();

      advanceTime(500);
      expect(tracker.getElapsed()).toBe(500);

      advanceTime(500);
      expect(tracker.getElapsed()).toBe(1000);
    });
  });

  describe('complete', () => {
    it('should return complete metrics', () => {
      const tracker = new LatencyTracker();

      tracker.startPhase('recordingStart');
      advanceTime(100);
      tracker.endPhase('recordingStart');

      tracker.startPhase('upload');
      advanceTime(50);
      tracker.endPhase('upload');

      tracker.startPhase('transcription');
      advanceTime(800);
      tracker.endPhase('transcription');

      tracker.startPhase('response');
      advanceTime(200);
      tracker.endPhase('response');

      tracker.startPhase('tts');
      advanceTime(300);
      tracker.endPhase('tts');

      const metrics = tracker.complete();

      expect(metrics.recordingStartMs).toBe(100);
      expect(metrics.uploadMs).toBe(50);
      expect(metrics.transcriptionMs).toBe(800);
      expect(metrics.responseMs).toBe(200);
      expect(metrics.ttsMs).toBe(300);
      expect(metrics.totalMs).toBe(1450);
      expect(metrics.timestamp).toBeInstanceOf(Date);
    });

    it('should return 0 for untracked phases', () => {
      const tracker = new LatencyTracker();
      advanceTime(1000);

      const metrics = tracker.complete();

      expect(metrics.recordingStartMs).toBe(0);
      expect(metrics.uploadMs).toBe(0);
      expect(metrics.transcriptionMs).toBe(0);
      expect(metrics.responseMs).toBe(0);
      expect(metrics.ttsMs).toBe(0);
      expect(metrics.totalMs).toBe(1000);
    });
  });
});

// =============================================================================
// analyzeLatency Tests
// =============================================================================

describe('analyzeLatency', () => {
  const createMetrics = (overrides: Partial<LatencyMetrics> = {}): LatencyMetrics => ({
    recordingStartMs: 200,
    uploadMs: 100,
    transcriptionMs: 800,
    responseMs: 300,
    ttsMs: 400,
    totalMs: 1800,
    timestamp: new Date(),
    ...overrides,
  });

  describe('Breakdown Calculation', () => {
    it('should calculate percentage for each phase', () => {
      const metrics = createMetrics({
        recordingStartMs: 500,
        uploadMs: 500,
        transcriptionMs: 500,
        responseMs: 500,
        ttsMs: 500,
        totalMs: 2500,
      });

      const report = analyzeLatency(metrics);

      report.breakdown.forEach((phase) => {
        expect(phase.percentage).toBeCloseTo(20, 1);
      });
    });

    it('should include all five phases', () => {
      const report = analyzeLatency(createMetrics());

      expect(report.breakdown).toHaveLength(5);
      expect(report.breakdown.map((b) => b.phase)).toEqual([
        'Recording Start',
        'Upload',
        'Transcription',
        'AI Response',
        'TTS Synthesis',
      ]);
    });

    it('should include duration for each phase', () => {
      const metrics = createMetrics({
        recordingStartMs: 100,
        uploadMs: 200,
        transcriptionMs: 300,
        responseMs: 400,
        ttsMs: 500,
        totalMs: 1500,
      });

      const report = analyzeLatency(metrics);

      expect(report.breakdown[0].durationMs).toBe(100);
      expect(report.breakdown[1].durationMs).toBe(200);
      expect(report.breakdown[2].durationMs).toBe(300);
      expect(report.breakdown[3].durationMs).toBe(400);
      expect(report.breakdown[4].durationMs).toBe(500);
    });
  });

  describe('Target Evaluation', () => {
    it('should pass when total is under target', () => {
      const metrics = createMetrics({ totalMs: 2500 });
      const report = analyzeLatency(metrics);

      expect(report.meetsTarget).toBe(true);
      expect(report.targetMs).toBe(3000);
    });

    it('should pass when total equals target', () => {
      const metrics = createMetrics({ totalMs: 3000 });
      const report = analyzeLatency(metrics);

      expect(report.meetsTarget).toBe(true);
    });

    it('should fail when total exceeds target', () => {
      const metrics = createMetrics({ totalMs: 3500 });
      const report = analyzeLatency(metrics);

      expect(report.meetsTarget).toBe(false);
    });
  });

  describe('Suggestions', () => {
    it('should suggest microphone check for slow recording start', () => {
      const metrics = createMetrics({ recordingStartMs: 600 });
      const report = analyzeLatency(metrics);

      expect(report.suggestions.some((s) => s.includes('Microphone'))).toBe(true);
    });

    it('should suggest compression for slow upload', () => {
      const metrics = createMetrics({ uploadMs: 300 });
      const report = analyzeLatency(metrics);

      expect(report.suggestions.some((s) => s.includes('Upload slow'))).toBe(true);
    });

    it('should suggest API check for slow transcription', () => {
      const metrics = createMetrics({ transcriptionMs: 2000 });
      const report = analyzeLatency(metrics);

      expect(report.suggestions.some((s) => s.includes('Transcription slow'))).toBe(true);
    });

    it('should suggest streaming for slow AI response', () => {
      const metrics = createMetrics({ responseMs: 600 });
      const report = analyzeLatency(metrics);

      expect(report.suggestions.some((s) => s.includes('AI response slow'))).toBe(true);
    });

    it('should suggest caching for slow TTS', () => {
      const metrics = createMetrics({ ttsMs: 1000 });
      const report = analyzeLatency(metrics);

      expect(report.suggestions.some((s) => s.includes('TTS slow'))).toBe(true);
    });

    it('should include pass message when target met', () => {
      const metrics = createMetrics({ totalMs: 2000 });
      const report = analyzeLatency(metrics);

      expect(report.suggestions[0]).toContain('within target');
    });

    it('should include fail message when target exceeded', () => {
      const metrics = createMetrics({ totalMs: 4000 });
      const report = analyzeLatency(metrics);

      expect(report.suggestions[0]).toContain('exceeds');
    });
  });
});

// =============================================================================
// getLatencyStatus Tests
// =============================================================================

describe('getLatencyStatus', () => {
  it('should return excellent for < 50% of target', () => {
    expect(getLatencyStatus(400, 1000)).toBe('excellent');
    expect(getLatencyStatus(100, 500)).toBe('excellent');
  });

  it('should return good for 50-75% of target', () => {
    expect(getLatencyStatus(600, 1000)).toBe('good');
    expect(getLatencyStatus(700, 1000)).toBe('good');
  });

  it('should return acceptable for 75-100% of target', () => {
    expect(getLatencyStatus(800, 1000)).toBe('acceptable');
    expect(getLatencyStatus(1000, 1000)).toBe('acceptable');
  });

  it('should return slow for 100-150% of target', () => {
    expect(getLatencyStatus(1100, 1000)).toBe('slow');
    expect(getLatencyStatus(1500, 1000)).toBe('slow');
  });

  it('should return critical for > 150% of target', () => {
    expect(getLatencyStatus(1600, 1000)).toBe('critical');
    expect(getLatencyStatus(3000, 1000)).toBe('critical');
  });

  it('should handle edge cases', () => {
    expect(getLatencyStatus(0, 1000)).toBe('excellent');
    expect(getLatencyStatus(500, 1000)).toBe('good'); // exactly 50%
    expect(getLatencyStatus(750, 1000)).toBe('acceptable'); // exactly 75%
  });
});

// =============================================================================
// formatLatency Tests
// =============================================================================

describe('formatLatency', () => {
  it('should format milliseconds for values under 1000', () => {
    expect(formatLatency(500)).toBe('500ms');
    expect(formatLatency(999)).toBe('999ms');
    expect(formatLatency(0)).toBe('0ms');
    expect(formatLatency(1)).toBe('1ms');
  });

  it('should format seconds for values 1000 and above', () => {
    expect(formatLatency(1000)).toBe('1.00s');
    expect(formatLatency(1500)).toBe('1.50s');
    expect(formatLatency(2345)).toBe('2.35s');
    expect(formatLatency(10000)).toBe('10.00s');
  });

  it('should round milliseconds', () => {
    expect(formatLatency(499.5)).toBe('500ms');
    expect(formatLatency(100.4)).toBe('100ms');
  });

  it('should format seconds with 2 decimal places', () => {
    expect(formatLatency(1234)).toBe('1.23s');
    expect(formatLatency(1235)).toBe('1.24s');
  });
});

// =============================================================================
// calculateAverageLatency Tests
// =============================================================================

describe('calculateAverageLatency', () => {
  const createMetrics = (values: number): LatencyMetrics => ({
    recordingStartMs: values,
    uploadMs: values * 2,
    transcriptionMs: values * 3,
    responseMs: values * 4,
    ttsMs: values * 5,
    totalMs: values * 15,
    timestamp: new Date(),
  });

  it('should return zeros for empty array', () => {
    const result = calculateAverageLatency([]);

    expect(result.recordingStartMs).toBe(0);
    expect(result.uploadMs).toBe(0);
    expect(result.transcriptionMs).toBe(0);
    expect(result.responseMs).toBe(0);
    expect(result.ttsMs).toBe(0);
    expect(result.totalMs).toBe(0);
  });

  it('should return same values for single measurement', () => {
    const metrics = createMetrics(100);
    const result = calculateAverageLatency([metrics]);

    expect(result.recordingStartMs).toBe(100);
    expect(result.uploadMs).toBe(200);
    expect(result.transcriptionMs).toBe(300);
    expect(result.responseMs).toBe(400);
    expect(result.ttsMs).toBe(500);
    expect(result.totalMs).toBe(1500);
  });

  it('should calculate average of multiple measurements', () => {
    const metrics1 = createMetrics(100);
    const metrics2 = createMetrics(200);
    const metrics3 = createMetrics(300);

    const result = calculateAverageLatency([metrics1, metrics2, metrics3]);

    expect(result.recordingStartMs).toBe(200); // (100+200+300)/3
    expect(result.uploadMs).toBe(400); // (200+400+600)/3
    expect(result.transcriptionMs).toBe(600);
    expect(result.responseMs).toBe(800);
    expect(result.ttsMs).toBe(1000);
    expect(result.totalMs).toBe(3000);
  });

  it('should return a new timestamp', () => {
    const oldDate = new Date('2020-01-01');
    const metrics: LatencyMetrics = {
      recordingStartMs: 100,
      uploadMs: 100,
      transcriptionMs: 100,
      responseMs: 100,
      ttsMs: 100,
      totalMs: 500,
      timestamp: oldDate,
    };

    const result = calculateAverageLatency([metrics]);

    expect(result.timestamp).not.toBe(oldDate);
    expect(result.timestamp.getTime()).toBeGreaterThan(oldDate.getTime());
  });
});

// =============================================================================
// calculatePercentileLatency Tests
// =============================================================================

describe('calculatePercentileLatency', () => {
  const createMetricsWithTotal = (totalMs: number): LatencyMetrics => ({
    recordingStartMs: 0,
    uploadMs: 0,
    transcriptionMs: 0,
    responseMs: 0,
    ttsMs: 0,
    totalMs,
    timestamp: new Date(),
  });

  it('should return 0 for empty array', () => {
    expect(calculatePercentileLatency([], 50)).toBe(0);
    expect(calculatePercentileLatency([], 95)).toBe(0);
  });

  it('should return single value for single measurement', () => {
    const metrics = [createMetricsWithTotal(1000)];

    expect(calculatePercentileLatency(metrics, 50)).toBe(1000);
    expect(calculatePercentileLatency(metrics, 99)).toBe(1000);
  });

  it('should calculate p50 (median)', () => {
    const metrics = [
      createMetricsWithTotal(100),
      createMetricsWithTotal(200),
      createMetricsWithTotal(300),
      createMetricsWithTotal(400),
      createMetricsWithTotal(500),
    ];

    expect(calculatePercentileLatency(metrics, 50)).toBe(300);
  });

  it('should calculate p90', () => {
    const metrics = Array.from({ length: 10 }, (_, i) =>
      createMetricsWithTotal((i + 1) * 100)
    );

    expect(calculatePercentileLatency(metrics, 90)).toBe(900);
  });

  it('should calculate p99', () => {
    const metrics = Array.from({ length: 100 }, (_, i) =>
      createMetricsWithTotal((i + 1) * 10)
    );

    expect(calculatePercentileLatency(metrics, 99)).toBe(990);
  });

  it('should handle unsorted input', () => {
    const metrics = [
      createMetricsWithTotal(500),
      createMetricsWithTotal(100),
      createMetricsWithTotal(300),
      createMetricsWithTotal(400),
      createMetricsWithTotal(200),
    ];

    // Should sort and get median
    expect(calculatePercentileLatency(metrics, 50)).toBe(300);
  });

  it('should handle p0 edge case', () => {
    const metrics = [
      createMetricsWithTotal(100),
      createMetricsWithTotal(200),
      createMetricsWithTotal(300),
    ];

    // p0 should return first element
    expect(calculatePercentileLatency(metrics, 0)).toBe(100);
  });

  it('should handle p100 edge case', () => {
    const metrics = [
      createMetricsWithTotal(100),
      createMetricsWithTotal(200),
      createMetricsWithTotal(300),
    ];

    expect(calculatePercentileLatency(metrics, 100)).toBe(300);
  });
});

// =============================================================================
// logLatencyReport Tests
// =============================================================================

describe('logLatencyReport', () => {
  const createReport = (): LatencyReport => ({
    metrics: {
      recordingStartMs: 200,
      uploadMs: 100,
      transcriptionMs: 800,
      responseMs: 300,
      ttsMs: 400,
      totalMs: 1800,
      timestamp: new Date(),
    },
    breakdown: [
      { phase: 'Recording Start', durationMs: 200, percentage: 11.1 },
      { phase: 'Upload', durationMs: 100, percentage: 5.6 },
      { phase: 'Transcription', durationMs: 800, percentage: 44.4 },
      { phase: 'AI Response', durationMs: 300, percentage: 16.7 },
      { phase: 'TTS Synthesis', durationMs: 400, percentage: 22.2 },
    ],
    meetsTarget: true,
    targetMs: 3000,
    suggestions: ['Total latency within target'],
  });

  it('should not log in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const consoleSpy = vi.spyOn(console, 'group');
    logLatencyReport(createReport());

    expect(consoleSpy).not.toHaveBeenCalled();
    process.env.NODE_ENV = originalEnv;
  });

  it('should log in development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const groupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    logLatencyReport(createReport());

    expect(groupSpy).toHaveBeenCalledWith('[Voice Latency Report]');
    expect(logSpy).toHaveBeenCalled();
    expect(groupEndSpy).toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });

  it('should log breakdown phases', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const logs: string[] = [];
    vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      logs.push(args.join(' '));
    });
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    logLatencyReport(createReport());

    const hasBreakdown = logs.some(
      (log) =>
        log.includes('Recording Start') ||
        log.includes('Upload') ||
        log.includes('Transcription')
    );
    expect(hasBreakdown).toBe(true);

    process.env.NODE_ENV = originalEnv;
  });

  it('should show PASS status when target met', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const logs: string[] = [];
    vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      logs.push(args.join(' '));
    });
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    const report = createReport();
    report.meetsTarget = true;
    logLatencyReport(report);

    const hasPass = logs.some((log) => log.includes('PASS'));
    expect(hasPass).toBe(true);

    process.env.NODE_ENV = originalEnv;
  });

  it('should show FAIL status when target not met', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const logs: string[] = [];
    vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      logs.push(args.join(' '));
    });
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    const report = createReport();
    report.meetsTarget = false;
    logLatencyReport(report);

    const hasFail = logs.some((log) => log.includes('FAIL'));
    expect(hasFail).toBe(true);

    process.env.NODE_ENV = originalEnv;
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Integration', () => {
  it('should track complete voice interaction flow', () => {
    const tracker = new LatencyTracker();

    // Simulate voice interaction
    tracker.startPhase('recordingStart');
    advanceTime(300);
    tracker.endPhase('recordingStart');

    tracker.startPhase('upload');
    advanceTime(150);
    tracker.endPhase('upload');

    tracker.startPhase('transcription');
    advanceTime(1200);
    tracker.endPhase('transcription');

    tracker.startPhase('response');
    advanceTime(400);
    tracker.endPhase('response');

    tracker.startPhase('tts');
    advanceTime(600);
    tracker.endPhase('tts');

    const metrics = tracker.complete();
    const report = analyzeLatency(metrics);

    // Total should be 2650ms, under 3000ms target
    expect(metrics.totalMs).toBe(2650);
    expect(report.meetsTarget).toBe(true);

    // Check breakdown percentages add up
    const totalPercentage = report.breakdown.reduce((sum, b) => sum + b.percentage, 0);
    expect(totalPercentage).toBeCloseTo(100, 0);
  });

  it('should identify bottleneck in slow transcription', () => {
    const tracker = new LatencyTracker();

    tracker.startPhase('recordingStart');
    advanceTime(100);
    tracker.endPhase('recordingStart');

    tracker.startPhase('upload');
    advanceTime(50);
    tracker.endPhase('upload');

    // Slow transcription
    tracker.startPhase('transcription');
    advanceTime(2500);
    tracker.endPhase('transcription');

    tracker.startPhase('response');
    advanceTime(200);
    tracker.endPhase('response');

    tracker.startPhase('tts');
    advanceTime(300);
    tracker.endPhase('tts');

    const metrics = tracker.complete();
    const report = analyzeLatency(metrics);

    expect(report.meetsTarget).toBe(false);
    expect(report.suggestions.some((s) => s.includes('Transcription slow'))).toBe(true);

    // Transcription should be highest percentage
    const transcriptionBreakdown = report.breakdown.find((b) => b.phase === 'Transcription');
    expect(transcriptionBreakdown!.percentage).toBeGreaterThan(50);
  });
});
