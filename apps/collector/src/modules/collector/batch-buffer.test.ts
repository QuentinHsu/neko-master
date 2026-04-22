import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestBackend, createTestDatabase } from '../../__tests__/helpers.js';
import type { StatsDatabase } from '../db/db.js';
import { BatchBuffer } from './batch-buffer.js';

describe('BatchBuffer node peak calculation', () => {
  let db: StatsDatabase;
  let cleanup: () => void;
  let backendId: number;

  beforeEach(() => {
    ({ db, cleanup } = createTestDatabase());
    backendId = createTestBackend(db);
  });

  afterEach(() => {
    cleanup();
  });

  it('should preserve per-sample node peaks when minute traffic rows are merged', () => {
    const buffer = new BatchBuffer();
    const now = Date.now();

    buffer.add(backendId, {
      domain: 'example.com',
      ip: '1.1.1.1',
      chain: 'ProxyA',
      chains: ['ProxyA', 'Match'],
      rule: 'Match',
      rulePayload: '',
      upload: 120,
      download: 600,
      sourceIP: '192.168.1.10',
      sampleDurationMs: 1000,
      timestampMs: now,
    });

    buffer.add(backendId, {
      domain: 'example.com',
      ip: '1.1.1.1',
      chain: 'ProxyA',
      chains: ['ProxyA', 'Match'],
      rule: 'Match',
      rulePayload: '',
      upload: 120,
      download: 600,
      sourceIP: '192.168.1.10',
      sampleDurationMs: 1000,
      timestampMs: now + 1000,
    });

    const result = buffer.flush(db, undefined, backendId, 'Test');
    expect(result.trafficOk).toBe(true);

    const proxies = db.getProxyStats(backendId);
    const proxy = proxies.find((item) => item.chain === 'ProxyA');

    expect(proxy).toBeDefined();
    expect(proxy?.totalUpload).toBe(240);
    expect(proxy?.totalDownload).toBe(1200);
    expect(proxy?.maxUploadPerSecond).toBe(120);
    expect(proxy?.maxDownloadPerSecond).toBe(600);
  });
});
