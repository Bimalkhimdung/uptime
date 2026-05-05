'use client';
import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { api } from '@/lib/api';

type Daily = { date: string; activeUsers: number; newUsers: number; sessions: number };

type SiteAnalytics = {
  property: string;
  range: { start: string; end: string };
  totals: {
    activeUsers: number;
    newUsers: number;
    sessions: number;
    screenPageViews: number;
    averageSessionDuration: number;
    bounceRate: number;
  };
  realtimeActiveUsers: number;
  daily: Daily[];
  topPages: Array<{ path: string; views: number }>;
};

function fmtDuration(seconds: number) {
  if (!seconds) return '0s';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function AnalyticsCard({
  siteId,
  hasProperty,
}: {
  siteId: string;
  hasProperty: boolean;
}) {
  const [data, setData] = useState<SiteAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasProperty) {
      setLoading(false);
      return;
    }
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        const result = await api.sites.analytics(siteId);
        if (!cancel) setData(result);
      } catch (err: any) {
        if (!cancel) setError(err.message || 'Failed to load analytics');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [siteId, hasProperty]);

  return (
    <div className="bg-[#171a21] border border-white/[0.04] rounded-xl p-6">
      <div className="flex items-baseline justify-between mb-5">
        <h3 className="font-bold text-white">
          Audience<span className="text-emerald-400">.</span>
        </h3>
        {data && (
          <p className="text-[10px] text-slate-600 uppercase tracking-widest">
            Last 28 days
          </p>
        )}
      </div>

      {!hasProperty ? (
        <p className="text-sm text-slate-400">
          Link a GA4 property in <span className="text-slate-200 font-medium">Edit</span> to see active
          users, new users, and traffic for this site.
        </p>
      ) : loading ? (
        <div className="h-32 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <Stat label="Active users" value={data.totals.activeUsers.toLocaleString()} />
            <Stat label="New users" value={data.totals.newUsers.toLocaleString()} />
            <Stat label="Sessions" value={data.totals.sessions.toLocaleString()} />
            <Stat label="Page views" value={data.totals.screenPageViews.toLocaleString()} />
            <Stat label="Avg session" value={fmtDuration(data.totals.averageSessionDuration)} />
            <Stat
              label="Bounce rate"
              value={`${(data.totals.bounceRate * 100).toFixed(1)}%`}
            />
          </div>

          <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
            <span className="relative flex w-2.5 h-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
            <p className="text-sm text-slate-200">
              <span className="text-emerald-300 font-bold tabular-nums">
                {data.realtimeActiveUsers}
              </span>{' '}
              <span className="text-slate-400">active users right now</span>
            </p>
          </div>

          {data.daily.length > 0 && (
            <div className="h-44 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.daily}
                  margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
                >
                  <XAxis
                    dataKey="date"
                    stroke="#475569"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={30}
                  />
                  <YAxis
                    stroke="#475569"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1d24',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      fontSize: 12,
                    }}
                    itemStyle={{ color: '#34d399' }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="activeUsers"
                    name="Active users"
                    stroke="#34d399"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="newUsers"
                    name="New users"
                    stroke="#a78bfa"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {data.topPages.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-2">
                Top pages
              </p>
              <div className="space-y-1.5">
                {data.topPages.slice(0, 5).map((p) => (
                  <div
                    key={p.path}
                    className="flex items-center justify-between text-sm gap-3 px-3 py-1.5 rounded-md hover:bg-white/[0.02]"
                  >
                    <span className="text-slate-300 truncate" title={p.path}>
                      {p.path || '/'}
                    </span>
                    <span className="text-slate-400 tabular-nums flex-shrink-0">
                      {p.views.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
    </div>
  );
}
