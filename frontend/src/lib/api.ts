const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
  },

  incidents: {
    list: () => request<any[]>('/incidents'),
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
