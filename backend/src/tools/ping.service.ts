import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import * as net from 'net';

export type PingMode = 'icmp' | 'tcp';

export type PingPacket = {
  seq: number;
  status: 'ok' | 'timeout' | 'error';
  rttMs: number | null;
  ttl: number | null;
  error: string | null;
};

export type PingSummary = {
  sent: number;
  received: number;
  lossPercent: number;
  minMs: number | null;
  avgMs: number | null;
  maxMs: number | null;
  stddevMs: number | null;
};

export type PingResult = {
  host: string;
  mode: PingMode;
  port: number | null;
  count: number;
  resolvedIp: string | null;
  packets: PingPacket[];
  summary: PingSummary;
  fetchedAt: string;
  fallbackReason: string | null;
};

const DEFAULT_COUNT = 4;
const MAX_COUNT = 10;
const ICMP_TIMEOUT_SEC = 2;
const TCP_TIMEOUT_MS = 3_000;
const TCP_INTERVAL_MS = 250;

@Injectable()
export class PingService {
  private readonly logger = new Logger(PingService.name);

  async ping(
    host: string,
    opts: {
      mode?: PingMode;
      count?: number;
      port?: number;
    } = {},
  ): Promise<PingResult> {
    const count = Math.max(1, Math.min(MAX_COUNT, opts.count ?? DEFAULT_COUNT));
    const requestedMode: PingMode = opts.mode ?? 'icmp';
    const port = opts.port ?? 443;
    const fetchedAt = new Date().toISOString();
    let fallbackReason: string | null = null;

    if (requestedMode === 'icmp') {
      const icmp = await this.icmp(host, count);
      if (icmp.ok) {
        return { ...icmp.result, fetchedAt, fallbackReason };
      }
      this.logger.warn(`ICMP ping fell back for ${host}: ${icmp.reason}`);
      fallbackReason = `ICMP unavailable (${icmp.reason}). Showing TCP ping instead.`;
    }

    const tcp = await this.tcp(host, port, count);
    return {
      ...tcp,
      mode: 'tcp',
      fetchedAt,
      fallbackReason,
    };
  }

  /** Shell out to the system `ping` command. Returns ok=false if unavailable. */
  private async icmp(
    host: string,
    count: number,
  ): Promise<
    | { ok: true; result: Omit<PingResult, 'fetchedAt' | 'fallbackReason'> }
    | { ok: false; reason: string }
  > {
    // macOS's ping interprets -W as milliseconds, Linux as seconds. To
    // sidestep the inconsistency we pass -W in the right unit per platform.
    const platform = process.platform;
    let args: string[];
    if (platform === 'win32') {
      args = ['-n', String(count), '-w', '2000', host];
    } else if (platform === 'darwin') {
      args = ['-c', String(count), '-W', String(ICMP_TIMEOUT_SEC * 1000), host];
    } else {
      args = ['-c', String(count), '-W', String(ICMP_TIMEOUT_SEC), host];
    }

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let proc: ReturnType<typeof spawn>;
      try {
        proc = spawn('ping', args);
      } catch (err) {
        resolve({ ok: false, reason: (err as Error).message });
        return;
      }
      proc.stdout?.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });
      proc.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });
      proc.on('error', (err) => {
        resolve({ ok: false, reason: err.message });
      });
      proc.on('close', (code) => {
        if (code !== 0 && !stdout) {
          resolve({
            ok: false,
            reason: stderr.trim() || `ping exited with code ${code}`,
          });
          return;
        }
        const parsed = parseIcmpOutput(stdout, count, host);
        resolve({ ok: true, result: parsed });
      });
    });
  }

  /** TCP "ping" — open a connection N times sequentially and time it. */
  private async tcp(
    host: string,
    port: number,
    count: number,
  ): Promise<Omit<PingResult, 'fetchedAt' | 'fallbackReason'>> {
    const packets: PingPacket[] = [];
    const resolvedIp: string | null = null;
    for (let seq = 1; seq <= count; seq++) {
      const packet = await this.tcpProbe(host, port, seq);
      if (!resolvedIp && packet.status === 'ok') {
        // First successful packet's IP comes via the socket — capture during the probe.
      }
      packets.push(packet);
      if (seq < count) await wait(TCP_INTERVAL_MS);
    }
    return {
      host,
      mode: 'tcp',
      port,
      count,
      resolvedIp,
      packets,
      summary: summarize(packets),
    };
  }

  private tcpProbe(
    host: string,
    port: number,
    seq: number,
  ): Promise<PingPacket> {
    return new Promise((resolve) => {
      const start = process.hrtime.bigint();
      const socket = new net.Socket();
      let settled = false;
      const finish = (status: PingPacket['status'], error: string | null) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        const rttMs =
          status === 'ok'
            ? Number((process.hrtime.bigint() - start) / 1_000n) / 1000
            : null;
        resolve({ seq, status, rttMs, ttl: null, error });
      };
      socket.setTimeout(TCP_TIMEOUT_MS);
      socket.once('connect', () => finish('ok', null));
      socket.once('timeout', () =>
        finish('timeout', `Timeout after ${TCP_TIMEOUT_MS}ms`),
      );
      socket.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'ECONNREFUSED') {
          // Connection refused still means the host is reachable — count as ok.
          finish('ok', null);
        } else {
          finish('error', err.message || err.code || 'Unknown error');
        }
      });
      try {
        socket.connect(port, host);
      } catch (err) {
        finish('error', err instanceof Error ? err.message : String(err));
      }
    });
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function summarize(packets: PingPacket[]): PingSummary {
  const sent = packets.length;
  const ok = packets.filter((p) => p.status === 'ok' && p.rttMs != null);
  const received = ok.length;
  const lossPercent =
    sent > 0 ? Math.round(((sent - received) / sent) * 1000) / 10 : 0;
  if (ok.length === 0) {
    return {
      sent,
      received,
      lossPercent,
      minMs: null,
      avgMs: null,
      maxMs: null,
      stddevMs: null,
    };
  }
  const rtts = ok.map((p) => p.rttMs as number);
  const min = Math.min(...rtts);
  const max = Math.max(...rtts);
  const avg = rtts.reduce((a, b) => a + b, 0) / rtts.length;
  const variance =
    rtts.reduce((sum, v) => sum + (v - avg) ** 2, 0) / rtts.length;
  const stddev = Math.sqrt(variance);
  return {
    sent,
    received,
    lossPercent,
    minMs: round(min, 2),
    avgMs: round(avg, 2),
    maxMs: round(max, 2),
    stddevMs: round(stddev, 2),
  };
}

function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function parseIcmpOutput(
  output: string,
  expectedCount: number,
  host: string,
): Omit<PingResult, 'fetchedAt' | 'fallbackReason'> {
  const lines = output.split(/\r?\n/);
  let resolvedIp: string | null = null;
  const headerMatch = output.match(/PING\s+\S+\s+\(([^)]+)\)/i);
  if (headerMatch) resolvedIp = headerMatch[1];

  // Per-packet matches — supports BSD/Linux/macOS and Windows formats.
  const packets: PingPacket[] = [];
  let seq = 1;
  for (const line of lines) {
    // Unix: 64 bytes from 142.250.190.46: icmp_seq=0 ttl=115 time=10.2 ms
    const unix = line.match(
      /bytes from\s+([^:\s]+)(?::|\s)\s*icmp_seq=(\d+)\s+ttl=(\d+)\s+time=([0-9.]+)\s*ms/i,
    );
    if (unix) {
      if (!resolvedIp) resolvedIp = unix[1];
      packets.push({
        seq: parseInt(unix[2], 10) + 1,
        status: 'ok',
        rttMs: parseFloat(unix[4]),
        ttl: parseInt(unix[3], 10),
        error: null,
      });
      continue;
    }
    // Windows: Reply from 142.250.190.46: bytes=32 time=10ms TTL=115
    const win = line.match(
      /Reply from\s+([^:]+):\s*bytes=\d+\s+time[=<]([0-9.]+)\s*ms\s+TTL=(\d+)/i,
    );
    if (win) {
      if (!resolvedIp) resolvedIp = win[1];
      packets.push({
        seq: seq++,
        status: 'ok',
        rttMs: parseFloat(win[2]),
        ttl: parseInt(win[3], 10),
        error: null,
      });
      continue;
    }
    if (
      /Request timeout|Destination Host Unreachable|Request timed out/i.test(
        line,
      )
    ) {
      packets.push({
        seq: seq++,
        status: 'timeout',
        rttMs: null,
        ttl: null,
        error: line.trim(),
      });
      continue;
    }
  }

  // Pad missing packets up to the expected count as timeouts.
  while (packets.length < expectedCount) {
    packets.push({
      seq: packets.length + 1,
      status: 'timeout',
      rttMs: null,
      ttl: null,
      error: 'No reply',
    });
  }

  return {
    host,
    mode: 'icmp',
    port: null,
    count: expectedCount,
    resolvedIp,
    packets: packets.slice(0, expectedCount),
    summary: summarize(packets.slice(0, expectedCount)),
  };
}
