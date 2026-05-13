import { Injectable, Logger } from '@nestjs/common';
import * as net from 'net';
import * as dgram from 'dgram';
import { randomBytes } from 'crypto';

export type PortProtocol = 'tcp' | 'udp';

export type PortStatus =
  | 'open'
  | 'closed'
  | 'timeout'
  | 'open|filtered'
  | 'error';

export type PortResult = {
  port: number;
  status: PortStatus;
  service: string | null;
  latencyMs: number | null;
  error: string | null;
};

export type PortCheckResult = {
  host: string;
  protocol: PortProtocol;
  fetchedAt: string;
  results: PortResult[];
};

// Well-known TCP service names by port.
const SERVICE_BY_PORT: Record<number, string> = {
  20: 'FTP-DATA',
  21: 'FTP',
  22: 'SSH',
  23: 'Telnet',
  25: 'SMTP',
  53: 'DNS',
  67: 'DHCP',
  68: 'DHCP',
  69: 'TFTP',
  80: 'HTTP',
  110: 'POP3',
  111: 'RPC',
  119: 'NNTP',
  123: 'NTP',
  135: 'RPC',
  137: 'NetBIOS',
  138: 'NetBIOS',
  139: 'NetBIOS',
  143: 'IMAP',
  161: 'SNMP',
  179: 'BGP',
  194: 'IRC',
  443: 'HTTPS',
  445: 'SMB',
  465: 'SMTPS',
  514: 'Syslog',
  515: 'LPD',
  587: 'SMTP submission',
  636: 'LDAPS',
  873: 'rsync',
  993: 'IMAPS',
  995: 'POP3S',
  1080: 'SOCKS',
  1194: 'OpenVPN',
  1433: 'MSSQL',
  1521: 'Oracle DB',
  1723: 'PPTP',
  2049: 'NFS',
  2082: 'cPanel',
  2083: 'cPanel SSL',
  2222: 'SSH alt',
  2375: 'Docker',
  2376: 'Docker TLS',
  3000: 'HTTP-alt / Node',
  3001: 'HTTP-alt',
  3306: 'MySQL',
  3389: 'RDP',
  4444: 'HTTP-alt',
  5000: 'HTTP-alt / Flask',
  5432: 'PostgreSQL',
  5672: 'AMQP',
  5900: 'VNC',
  5984: 'CouchDB',
  6379: 'Redis',
  8000: 'HTTP-alt',
  8008: 'HTTP-alt',
  8080: 'HTTP-alt',
  8081: 'HTTP-alt',
  8443: 'HTTPS-alt',
  8888: 'HTTP-alt',
  9000: 'PHP-FPM / HTTP-alt',
  9092: 'Kafka',
  9200: 'Elasticsearch',
  9418: 'Git',
  11211: 'Memcached',
  15672: 'RabbitMQ Mgmt',
  25565: 'Minecraft',
  27017: 'MongoDB',
};

export const COMMON_PORT_PRESETS: Record<string, number[]> = {
  common: [
    21, 22, 25, 53, 80, 110, 143, 443, 465, 587, 993, 995, 3306, 5432, 6379,
    8080, 8443,
  ],
  web: [80, 443, 3000, 3001, 5000, 8000, 8080, 8443],
  mail: [25, 110, 143, 465, 587, 993, 995],
  db: [1433, 1521, 3306, 5432, 6379, 9200, 11211, 27017],
  admin: [22, 23, 2222, 3389, 5900],
};

const DEFAULT_TIMEOUT_MS = 4_000;
const CONCURRENCY = 16;
const MAX_PORTS = 64;

@Injectable()
export class PortCheckService {
  private readonly logger = new Logger(PortCheckService.name);

  async check(
    host: string,
    ports: number[],
    protocol: PortProtocol = 'tcp',
    timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ): Promise<PortCheckResult> {
    const fetchedAt = new Date().toISOString();
    const unique = Array.from(new Set(ports.filter((p) => p > 0 && p < 65536)));
    const limited = unique.slice(0, MAX_PORTS).sort((a, b) => a - b);

    const probe = protocol === 'udp' ? this.probeUdp : this.probeTcp;

    const results: PortResult[] = [];
    for (let i = 0; i < limited.length; i += CONCURRENCY) {
      const batch = limited.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map((port) => probe.call(this, host, port, timeoutMs)),
      );
      results.push(...batchResults);
    }

    return { host, protocol, fetchedAt, results };
  }

  private probeTcp(
    host: string,
    port: number,
    timeoutMs: number,
  ): Promise<PortResult> {
    return new Promise((resolve) => {
      const start = Date.now();
      const socket = new net.Socket();
      let settled = false;

      const finish = (status: PortStatus, error: string | null) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolve({
          port,
          status,
          service: SERVICE_BY_PORT[port] ?? null,
          latencyMs: status === 'open' ? Date.now() - start : null,
          error,
        });
      };

      socket.setTimeout(timeoutMs);

      socket.once('connect', () => finish('open', null));
      socket.once('timeout', () =>
        finish('timeout', `Timeout after ${timeoutMs}ms`),
      );
      socket.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'ECONNREFUSED') {
          finish('closed', null);
        } else {
          finish('error', err.message || err.code || 'Unknown error');
        }
      });

      try {
        socket.connect(port, host);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        finish('error', msg);
      }
    });
  }

  // UDP is connectionless, so "open" detection is best-effort:
  //   - We send a probe packet and listen for any reply.
  //   - If the OS surfaces an ICMP port-unreachable (ECONNREFUSED) we treat
  //     that as 'closed'.
  //   - If nothing comes back before the timeout we report 'open|filtered'
  //     (matching nmap's UDP terminology) because we genuinely can't tell.
  private probeUdp(
    host: string,
    port: number,
    timeoutMs: number,
  ): Promise<PortResult> {
    return new Promise((resolve) => {
      const start = Date.now();
      const socket = dgram.createSocket('udp4');
      let settled = false;
      let timer: NodeJS.Timeout | null = null;

      const finish = (status: PortStatus, error: string | null) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        try {
          socket.close();
        } catch {
          // ignore
        }
        resolve({
          port,
          status,
          service: SERVICE_BY_PORT[port] ?? null,
          latencyMs: status === 'open' ? Date.now() - start : null,
          error,
        });
      };

      socket.once('message', () => finish('open', null));
      socket.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'ECONNREFUSED') finish('closed', null);
        else finish('error', err.message || err.code || 'Unknown error');
      });

      timer = setTimeout(() => {
        finish('open|filtered', `No reply within ${timeoutMs}ms`);
      }, timeoutMs);

      const payload = udpProbePayload(port);
      socket.send(payload, port, host, (err) => {
        if (err && !settled) finish('error', err.message);
      });
    });
  }
}

// Send a protocol-specific probe for well-known UDP services so we actually
// get a reply (and report 'open' instead of 'open|filtered'). Anything else
// gets a small random payload.
function udpProbePayload(port: number): Buffer {
  if (port === 53) {
    // Standard DNS query for "." (root) NS record.
    return Buffer.from([
      0x12, 0x34, 0x01, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x02, 0x00, 0x01,
    ]);
  }
  if (port === 123) {
    // NTPv4 client request (mode 3).
    return Buffer.concat([Buffer.from([0x1b]), Buffer.alloc(47)]);
  }
  return randomBytes(8);
}
