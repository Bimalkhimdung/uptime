'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function IncidentsPage() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.incidents
      .list()
      .then(setIncidents)
      .finally(() => setFetching(false));
  }, [user]);

  const open = incidents.filter((i) => !i.resolved);
  const resolved = incidents.filter((i) => i.resolved);

  return (
    <div className="px-12 pt-12 pb-20 max-w-[1400px]">
        <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white mb-2">
          Incidents<span className="text-emerald-400">.</span>
        </h1>
        <p className="text-slate-400 mt-2 mb-12">
          All downtime events across your monitors.
        </p>

        {open.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              <h2 className="font-semibold text-red-400 text-xs uppercase tracking-[0.2em]">
                Active ({open.length})
              </h2>
            </div>
            <div className="bg-red-500/[0.04] border border-red-500/20 rounded-3xl divide-y divide-red-500/10">
              {open.map((inc) => (
                <div key={inc.id} className="flex items-center px-6 py-4">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/monitors/${inc.monitor.id}`}
                      className="font-semibold text-white hover:text-emerald-400 transition-colors"
                    >
                      {inc.monitor.name}
                    </Link>
                    <p className="text-xs text-slate-500 mt-0.5">{inc.monitor.url}</p>
                    {inc.errorMessage && (
                      <p className="text-red-400 text-xs mt-1">{inc.errorMessage}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-500">Started</p>
                    <p className="text-sm text-white">
                      {new Date(inc.startTime).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="font-semibold text-slate-400 text-xs uppercase tracking-[0.2em] mb-3">
            Resolved ({resolved.length})
          </h2>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl divide-y divide-white/5">
            {fetching ? (
              <div className="py-12 text-center text-slate-500">Loading…</div>
            ) : resolved.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                No resolved incidents yet 🎉
              </div>
            ) : (
              resolved.map((inc) => (
                <div
                  key={inc.id}
                  className="flex items-center px-6 py-4 hover:bg-white/[0.02] transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mr-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/monitors/${inc.monitor.id}`}
                      className="font-semibold text-white hover:text-emerald-400 transition-colors"
                    >
                      {inc.monitor.name}
                    </Link>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(inc.startTime).toLocaleString()} →{' '}
                      {inc.endTime
                        ? new Date(inc.endTime).toLocaleString()
                        : '—'}
                    </p>
                  </div>
                  <div className="text-sm text-slate-400 flex-shrink-0">
                    {inc.duration
                      ? `${Math.round(inc.duration / 60)} min downtime`
                      : '—'}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
    </div>
  );
}
