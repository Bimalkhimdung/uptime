import { Injectable, Logger } from '@nestjs/common';
import * as http from 'http';
import * as https from 'https';
import * as tls from 'tls';

export type HttpMethod =
  | 'GET'
  | 'HEAD'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'OPTIONS'
  | 'PATCH';

export type Redirect = {
  from: string;
  to: string;
  statusCode: number;
};

export type SslSummary = {
  validFrom: string | null;
  validUntil: string | null;
  daysLeft: number | null;
  issuer: string | null;
  subject: string | null;
  authorized: boolean;
};

export type HttpCheckResult = {
  url: string;
  finalUrl: string;
  method: HttpMethod;
  ok: boolean;
  statusCode: number;
  statusText: string;
  responseTimeMs: number;
  headers: Record<string, string>;
  contentLength: number | null;
  contentType: string | null;
  bodyPreview: string | null;
  bodyTruncated: boolean;
  redirects: Redirect[];
  ssl: SslSummary | null;
  error: string | null;
};

export type RequestOptions = {
  headers?: Record<string, string>;
  body?: string | null;
  followRedirects?: boolean;
  // Body-preview budget — defaults to BODY_PREVIEW_BYTES.
  bodyPreviewBytes?: number;
};

const MAX_REDIRECTS = 5;
const BODY_PREVIEW_BYTES = 4096;
const DEFAULT_TIMEOUT_MS = 12_000;

@Injectable()
export class HttpCheckService {
  private readonly logger = new Logger(HttpCheckService.name);

  async check(
    inputUrl: string,
    method: HttpMethod = 'GET',
    timeoutMs: number = DEFAULT_TIMEOUT_MS,
    options: RequestOptions = {},
  ): Promise<HttpCheckResult> {
    const start = Date.now();
    const redirects: Redirect[] = [];
    let currentUrl = inputUrl;
    let ssl: SslSummary | null = null;
    const followRedirects = options.followRedirects !== false;
    const maxHops = followRedirects ? MAX_REDIRECTS : 0;
    const bodyCap = options.bodyPreviewBytes ?? BODY_PREVIEW_BYTES;

    try {
      for (let hop = 0; hop <= maxHops; hop++) {
        const { res, body, sslInfo } = await this.requestOnce(
          currentUrl,
          method,
          timeoutMs,
          {
            // The request body is only sent on the first hop — redirects with
            // 307/308 would normally preserve it, but the tool keeps things
            // predictable by dropping the body after the first request.
            headers: hop === 0 ? options.headers : undefined,
            body: hop === 0 ? options.body : null,
            bodyPreviewBytes: bodyCap,
          },
        );

        if (sslInfo) ssl = sslInfo;

        const statusCode = res.statusCode ?? 0;
        const location = res.headers.location;

        if (
          followRedirects &&
          statusCode >= 300 &&
          statusCode < 400 &&
          location &&
          hop < MAX_REDIRECTS
        ) {
          const next = new URL(location, currentUrl).toString();
          redirects.push({ from: currentUrl, to: next, statusCode });
          currentUrl = next;
          continue;
        }

        const headers = normalizeHeaders(res.headers);
        const contentType = headers['content-type'] ?? null;
        const contentLength = headers['content-length']
          ? parseInt(headers['content-length'], 10)
          : null;

        const { preview, truncated } = decodeBody(body, contentType, bodyCap);

        return {
          url: inputUrl,
          finalUrl: currentUrl,
          method,
          ok: statusCode >= 200 && statusCode < 400,
          statusCode,
          statusText: res.statusMessage ?? '',
          responseTimeMs: Date.now() - start,
          headers,
          contentLength,
          contentType,
          bodyPreview: preview,
          bodyTruncated: truncated,
          redirects,
          ssl,
          error: null,
        };
      }

      return errorResult(
        inputUrl,
        method,
        redirects,
        ssl,
        Date.now() - start,
        'Too many redirects',
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`HTTP check failed for ${inputUrl}: ${msg}`);
      return errorResult(
        inputUrl,
        method,
        redirects,
        ssl,
        Date.now() - start,
        msg,
      );
    }
  }

  private requestOnce(
    target: string,
    method: HttpMethod,
    timeoutMs: number,
    perRequest: {
      headers?: Record<string, string>;
      body?: string | null;
      bodyPreviewBytes: number;
    },
  ): Promise<{
    res: http.IncomingMessage;
    body: Buffer;
    sslInfo: SslSummary | null;
  }> {
    return new Promise((resolve, reject) => {
      let url: URL;
      try {
        url = new URL(target);
      } catch {
        reject(new Error(`Invalid URL: ${target}`));
        return;
      }

      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        reject(new Error(`Unsupported protocol: ${url.protocol}`));
        return;
      }

      const isHttps = url.protocol === 'https:';
      const lib = isHttps ? https : http;

      const mergedHeaders: Record<string, string> = {
        'User-Agent': 'UptimeMonitor-HttpCheck/1.0',
        Accept: '*/*',
        ...(perRequest.headers ?? {}),
      };
      // Set Content-Length only if a body is present and the caller hasn't.
      if (
        perRequest.body != null &&
        !hasHeader(mergedHeaders, 'content-length')
      ) {
        mergedHeaders['Content-Length'] = String(
          Buffer.byteLength(perRequest.body, 'utf8'),
        );
      }

      const req = lib.request(
        url,
        {
          method,
          headers: mergedHeaders,
          timeout: timeoutMs,
          ...(isHttps ? { rejectUnauthorized: false } : {}),
        },
        (res) => {
          let sslInfo: SslSummary | null = null;
          if (isHttps) {
            const socket = res.socket as tls.TLSSocket | undefined;
            if (socket && typeof socket.getPeerCertificate === 'function') {
              sslInfo = summarizeCert(
                socket.getPeerCertificate(),
                socket.authorized,
              );
            }
          }

          if (method === 'HEAD') {
            res.resume();
            resolve({ res, body: Buffer.alloc(0), sslInfo });
            return;
          }

          const chunks: Buffer[] = [];
          let received = 0;
          const cap = perRequest.bodyPreviewBytes;
          res.on('data', (chunk: Buffer) => {
            if (received >= cap) return;
            const room = cap - received;
            chunks.push(chunk.length > room ? chunk.subarray(0, room) : chunk);
            received += Math.min(chunk.length, room);
          });
          res.on('end', () => {
            resolve({ res, body: Buffer.concat(chunks), sslInfo });
          });
          res.on('error', (err) => reject(err));
        },
      );

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Timeout after ${timeoutMs}ms`));
      });
      req.on('error', (err) => reject(err));

      if (perRequest.body != null && method !== 'GET' && method !== 'HEAD') {
        req.write(perRequest.body);
      }
      req.end();
    });
  }
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
  const lower = name.toLowerCase();
  return Object.keys(headers).some((k) => k.toLowerCase() === lower);
}

function errorResult(
  inputUrl: string,
  method: HttpMethod,
  redirects: Redirect[],
  ssl: SslSummary | null,
  elapsed: number,
  message: string,
): HttpCheckResult {
  return {
    url: inputUrl,
    finalUrl: redirects.length ? redirects[redirects.length - 1].to : inputUrl,
    method,
    ok: false,
    statusCode: 0,
    statusText: '',
    responseTimeMs: elapsed,
    headers: {},
    contentLength: null,
    contentType: null,
    bodyPreview: null,
    bodyTruncated: false,
    redirects,
    ssl,
    error: message,
  };
}

function normalizeHeaders(
  headers: http.IncomingHttpHeaders,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (Array.isArray(v)) out[k] = v.join(', ');
    else if (v != null) out[k] = String(v);
  }
  return out;
}

function decodeBody(
  body: Buffer,
  contentType: string | null,
  cap: number = BODY_PREVIEW_BYTES,
): { preview: string | null; truncated: boolean } {
  if (body.length === 0) return { preview: null, truncated: false };

  const isText =
    !contentType ||
    contentType.includes('text/') ||
    contentType.includes('json') ||
    contentType.includes('xml') ||
    contentType.includes('javascript') ||
    contentType.includes('html');

  if (!isText) {
    return {
      preview: `(${body.length} bytes of ${contentType ?? 'binary'} content)`,
      truncated: false,
    };
  }

  const text = body.toString('utf8');
  return { preview: text, truncated: text.length >= cap };
}

function summarizeCert(
  cert:
    | tls.PeerCertificate
    | tls.DetailedPeerCertificate
    | Record<string, never>,
  authorized: boolean,
): SslSummary | null {
  if (!cert || Object.keys(cert).length === 0) return null;
  const c = cert as tls.PeerCertificate;
  if (!c.valid_to) return null;

  const validFrom = new Date(c.valid_from);
  const validUntil = new Date(c.valid_to);
  const daysLeft = Math.floor((validUntil.getTime() - Date.now()) / 86_400_000);
  return {
    validFrom: validFrom.toISOString(),
    validUntil: validUntil.toISOString(),
    daysLeft,
    issuer:
      typeof c.issuer === 'object' && c.issuer
        ? toScalar(c.issuer.O) || toScalar(c.issuer.CN)
        : null,
    subject:
      typeof c.subject === 'object' && c.subject
        ? toScalar(c.subject.CN) || toScalar(c.subject.O)
        : null,
    authorized,
  };
}

function toScalar(v: string | string[] | undefined): string | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}
