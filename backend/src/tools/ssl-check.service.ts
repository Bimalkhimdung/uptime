import { Injectable, Logger } from '@nestjs/common';
import * as tls from 'tls';

export type CertSummary = {
  subject: { CN: string | null; O: string | null };
  issuer: { CN: string | null; O: string | null };
  serialNumber: string | null;
  fingerprintSha256: string | null;
  validFrom: string | null;
  validUntil: string | null;
  daysLeft: number | null;
  altNames: string[];
  signatureAlgorithm: string | null;
  keyBits: number | null;
  selfSigned: boolean;
};

export type SslCheckResult = {
  host: string;
  port: number;
  authorized: boolean;
  authorizationError: string | null;
  hostnameMatches: boolean | null;
  protocol: string | null;
  cipher: { name: string; version: string } | null;
  certificate: CertSummary | null;
  chain: CertSummary[];
  fetchedAt: string;
  error: string | null;
};

const DEFAULT_TIMEOUT_MS = 10_000;

@Injectable()
export class SslCheckService {
  private readonly logger = new Logger(SslCheckService.name);

  async check(
    host: string,
    port = 443,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  ): Promise<SslCheckResult> {
    const fetchedAt = new Date().toISOString();
    try {
      const data = await this.connect(host, port, timeoutMs);
      return { ...data, fetchedAt };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`SSL check failed for ${host}:${port}: ${message}`);
      return emptyResult(host, port, fetchedAt, message);
    }
  }

  private connect(
    host: string,
    port: number,
    timeoutMs: number,
  ): Promise<Omit<SslCheckResult, 'fetchedAt'>> {
    return new Promise((resolve, reject) => {
      const socket = tls.connect({
        host,
        port,
        servername: host,
        rejectUnauthorized: false,
        timeout: timeoutMs,
      });

      socket.once('secureConnect', () => {
        try {
          const peer = socket.getPeerCertificate(true);
          const protocol = socket.getProtocol();
          const cipher = socket.getCipher();
          const authorized = socket.authorized;
          const authorizationError = socket.authorizationError
            ? (socket.authorizationError.message ??
              String(socket.authorizationError))
            : null;

          let hostnameMatches: boolean | null = null;
          if (peer && Object.keys(peer).length > 0) {
            const id = tls.checkServerIdentity(host, peer);
            hostnameMatches = id === undefined;
          }

          const chain: CertSummary[] = [];
          const seen = new Set<string>();
          let current: tls.DetailedPeerCertificate | undefined = peer;
          while (current && Object.keys(current).length > 0) {
            const fp =
              current.fingerprint256 || JSON.stringify(current.subject);
            if (seen.has(fp)) break;
            seen.add(fp);
            chain.push(summarize(current));
            const next = current.issuerCertificate;
            if (!next || next === current) break;
            current = next;
          }

          socket.end();

          resolve({
            host,
            port,
            authorized,
            authorizationError,
            hostnameMatches,
            protocol,
            cipher: cipher
              ? { name: cipher.name, version: cipher.version }
              : null,
            certificate: chain[0] ?? null,
            chain,
            error: null,
          });
        } catch (innerErr) {
          socket.destroy();
          reject(innerErr);
        }
      });

      socket.once('timeout', () => {
        socket.destroy();
        reject(new Error(`Timeout after ${timeoutMs}ms`));
      });
      socket.once('error', (err) => reject(err));
    });
  }
}

function summarize(cert: tls.DetailedPeerCertificate): CertSummary {
  const validFrom = cert.valid_from ? new Date(cert.valid_from) : null;
  const validUntil = cert.valid_to ? new Date(cert.valid_to) : null;
  const daysLeft = validUntil
    ? Math.floor((validUntil.getTime() - Date.now()) / 86_400_000)
    : null;

  const altNames = cert.subjectaltname
    ? cert.subjectaltname
        .split(',')
        .map((s) => s.trim().replace(/^DNS:/i, ''))
        .filter(Boolean)
    : [];

  const subjectCN = scalar(cert.subject?.CN);
  const subjectO = scalar(cert.subject?.O);
  const issuerCN = scalar(cert.issuer?.CN);
  const issuerO = scalar(cert.issuer?.O);

  const selfSigned =
    !!subjectCN && !!issuerCN && subjectCN === issuerCN && subjectO === issuerO;

  return {
    subject: { CN: subjectCN, O: subjectO },
    issuer: { CN: issuerCN, O: issuerO },
    serialNumber: cert.serialNumber ?? null,
    fingerprintSha256: cert.fingerprint256 ?? null,
    validFrom: validFrom ? validFrom.toISOString() : null,
    validUntil: validUntil ? validUntil.toISOString() : null,
    daysLeft,
    altNames,
    signatureAlgorithm:
      (cert as tls.DetailedPeerCertificate & { sigalg?: string }).sigalg ??
      null,
    keyBits:
      (cert as tls.DetailedPeerCertificate & { bits?: number }).bits ?? null,
    selfSigned,
  };
}

function scalar(v: string | string[] | undefined): string | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function emptyResult(
  host: string,
  port: number,
  fetchedAt: string,
  error: string,
): SslCheckResult {
  return {
    host,
    port,
    authorized: false,
    authorizationError: null,
    hostnameMatches: null,
    protocol: null,
    cipher: null,
    certificate: null,
    chain: [],
    fetchedAt,
    error,
  };
}
