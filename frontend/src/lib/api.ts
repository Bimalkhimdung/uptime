const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export type SslCert = {
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

function getAuthHeaders(): Record<string, string> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('uptime_token') : null;
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...(options.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Request failed');
  }
  return res.json();
}

// Auth
export const api = {
  auth: {
    register: (data: { email: string; password: string; name?: string }) =>
      request<{ token: string; user: any }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    login: (data: { email: string; password: string }) =>
      request<{ token: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    me: () => request<any>('/auth/me'),
  },

  monitors: {
    list: () => request<any[]>('/monitors'),
    get: (id: string) => request<any>(`/monitors/${id}`),
    create: (data: any) =>
      request<any>('/monitors', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request<any>(`/monitors/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<any>(`/monitors/${id}`, { method: 'DELETE' }),
    pause: (id: string) =>
      request<any>(`/monitors/${id}/pause`, { method: 'PATCH' }),
    resume: (id: string) =>
      request<any>(`/monitors/${id}/resume`, { method: 'PATCH' }),
    checks: (id: string, limit = 50) =>
      request<any[]>(`/monitors/${id}/checks?limit=${limit}`),
    incidents: (id: string) => request<any[]>(`/monitors/${id}/incidents`),
    testNotification: (id: string) =>
      request<{ sent: boolean; to: string }>(
        `/monitors/${id}/test-notification`,
        { method: 'POST' },
      ),
    refreshMetadata: (id: string) =>
      request<any>(`/monitors/${id}/refresh-metadata`, { method: 'POST' }),
  },

  incidents: {
    list: () => request<any[]>('/incidents'),
    get: (id: string) => request<any>(`/incidents/${id}`),
  },

  tools: {
    checkDomain: (domain: string) =>
      request<{
        domain: string;
        available: boolean;
        registrar: string | null;
        createdAt: string | null;
        expiresAt: string | null;
        updatedAt: string | null;
        daysLeft: number | null;
        nameservers: string[];
        status: string[];
      }>(`/tools/domain-check?domain=${encodeURIComponent(domain)}`),
    ping: (
      host: string,
      opts: { mode?: 'icmp' | 'tcp'; count?: number; port?: number } = {},
    ) => {
      const params = new URLSearchParams({ host });
      if (opts.mode) params.set('mode', opts.mode);
      if (opts.count) params.set('count', String(opts.count));
      if (opts.port) params.set('port', String(opts.port));
      return request<{
        host: string;
        mode: 'icmp' | 'tcp';
        port: number | null;
        count: number;
        resolvedIp: string | null;
        packets: Array<{
          seq: number;
          status: 'ok' | 'timeout' | 'error';
          rttMs: number | null;
          ttl: number | null;
          error: string | null;
        }>;
        summary: {
          sent: number;
          received: number;
          lossPercent: number;
          minMs: number | null;
          avgMs: number | null;
          maxMs: number | null;
          stddevMs: number | null;
        };
        fetchedAt: string;
        fallbackReason: string | null;
      }>(`/tools/ping?${params.toString()}`);
    },
    portCheck: (
      host: string,
      opts: { ports?: string; preset?: string; protocol?: 'tcp' | 'udp' },
    ) => {
      const params = new URLSearchParams({ host });
      if (opts.ports) params.set('ports', opts.ports);
      if (opts.preset) params.set('preset', opts.preset);
      if (opts.protocol) params.set('protocol', opts.protocol);
      return request<{
        host: string;
        protocol: 'tcp' | 'udp';
        fetchedAt: string;
        results: Array<{
          port: number;
          status: 'open' | 'closed' | 'timeout' | 'open|filtered' | 'error';
          service: string | null;
          latencyMs: number | null;
          error: string | null;
        }>;
      }>(`/tools/port-check?${params.toString()}`);
    },
    sslCheck: (host: string, port?: number) =>
      request<{
        host: string;
        port: number;
        authorized: boolean;
        authorizationError: string | null;
        hostnameMatches: boolean | null;
        protocol: string | null;
        cipher: { name: string; version: string } | null;
        certificate: SslCert | null;
        chain: SslCert[];
        fetchedAt: string;
        error: string | null;
      }>(`/tools/ssl-check?host=${encodeURIComponent(host)}${port ? `&port=${port}` : ''}`),
    curl: (spec: {
      url: string;
      method: string;
      headers: Array<{ name: string; value: string }>;
      body?: string;
      followRedirects?: boolean;
    }) =>
      request<{
        url: string;
        finalUrl: string;
        method: string;
        ok: boolean;
        statusCode: number;
        statusText: string;
        responseTimeMs: number;
        headers: Record<string, string>;
        contentLength: number | null;
        contentType: string | null;
        bodyPreview: string | null;
        bodyTruncated: boolean;
        redirects: Array<{ from: string; to: string; statusCode: number }>;
        ssl: {
          validFrom: string | null;
          validUntil: string | null;
          daysLeft: number | null;
          issuer: string | null;
          subject: string | null;
          authorized: boolean;
        } | null;
        error: string | null;
      }>('/tools/curl', {
        method: 'POST',
        body: JSON.stringify(spec),
      }),
    httpCheck: (url: string, method: string = 'GET') =>
      request<{
        url: string;
        finalUrl: string;
        method: string;
        ok: boolean;
        statusCode: number;
        statusText: string;
        responseTimeMs: number;
        headers: Record<string, string>;
        contentLength: number | null;
        contentType: string | null;
        bodyPreview: string | null;
        bodyTruncated: boolean;
        redirects: Array<{ from: string; to: string; statusCode: number }>;
        ssl: {
          validFrom: string | null;
          validUntil: string | null;
          daysLeft: number | null;
          issuer: string | null;
          subject: string | null;
          authorized: boolean;
        } | null;
        error: string | null;
      }>(`/tools/http-check?url=${encodeURIComponent(url)}&method=${encodeURIComponent(method)}`),
    dnsLookup: (domain: string, type: string = 'ALL') =>
      request<{
        host: string;
        sets: Array<{
          type: 'A' | 'AAAA' | 'MX' | 'TXT' | 'NS' | 'CNAME' | 'SOA' | 'CAA';
          records: Array<{
            type: string;
            value: string;
            priority?: number;
            ttl?: number | null;
          }>;
          error: string | null;
        }>;
      }>(`/tools/dns-lookup?domain=${encodeURIComponent(domain)}&type=${encodeURIComponent(type)}`),
    domainSuggestions: (domain: string) =>
      request<{
        input: string;
        suggestions: Array<{
          domain: string;
          available: boolean | null;
          expiresAt: string | null;
          registrar: string | null;
          priceUsd: number | null;
          currency: string;
        }>;
      }>(`/tools/domain-suggestions?domain=${encodeURIComponent(domain)}`),
  },

  sites: {
    list: () => request<any[]>('/sites'),
    get: (id: string) => request<any>(`/sites/${id}`),
    create: (data: { name?: string; url: string }) =>
      request<any>('/sites', { method: 'POST', body: JSON.stringify(data) }),
    update: (
      id: string,
      data: { name?: string; url?: string; gaPropertyId?: string | null },
    ) =>
      request<any>(`/sites/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<any>(`/sites/${id}`, { method: 'DELETE' }),
    refreshSeo: (id: string) =>
      request<any>(`/sites/${id}/seo/refresh`, { method: 'POST' }),
    analytics: (id: string) => request<any>(`/sites/${id}/analytics`),
  },

  users: {
    list: () => request<any[]>('/users'),
    get: (id: string) => request<any>(`/users/${id}`),
    create: (data: {
      email: string;
      password: string;
      name?: string;
      username?: string;
      isSuperuser?: boolean;
    }) =>
      request<any>('/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (
      id: string,
      data: {
        email?: string;
        password?: string;
        name?: string;
        username?: string;
        isSuperuser?: boolean;
      },
    ) =>
      request<any>(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },

  google: {
    status: () =>
      request<{
        configured: boolean;
        connected: boolean;
        email: string | null;
        connectedAt: string | null;
      }>('/integrations/google/status'),
    connect: () =>
      request<{ url: string }>('/integrations/google/connect'),
    disconnect: () =>
      request<{ ok: boolean }>('/integrations/google/disconnect', {
        method: 'DELETE',
      }),
    properties: () =>
      request<
        Array<{
          property: string;
          displayName: string;
          account: string | null;
          accountDisplayName: string | null;
        }>
      >('/google/analytics/properties'),
  },
};
