'use client';
import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import AddSiteModal from '@/components/seo/AddSiteModal';
import { SeoScoreBadge } from '@/components/seo/SeoScoreBadge';
import { ConfirmModal } from '@/components/dashboard/ConfirmModal';
import { GoogleConnectCard } from '@/components/seo/GoogleConnectCard';
import { PlusIcon } from '@/components/dashboard/icons';

function timeAgo(date: string | Date | null | undefined) {
  if (!date) return 'Never';
  const seconds = Math.floor(
    (Date.now() - new Date(date).getTime()) / 1000,
  );
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function SeoIndexInner() {
  const search = useSearchParams();
  const router = useRouter();
  const [sites, setSites] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<any | null>(null);
  const [banner, setBanner] = useState<
    { kind: 'success' | 'error'; message: string } | null
  >(null);

  useEffect(() => {
    const g = search.get('google');
    if (!g) return;
    if (g === 'connected') {
      setBanner({ kind: 'success', message: 'Google account connected successfully.' });
    } else if (g === 'error') {
      const reason = search.get('reason') || 'unknown';
      setBanner({ kind: 'error', message: `Google connection failed (${reason}).` });
    }
    // Clean the URL so refresh doesn't re-show the banner
    router.replace('/seo');
  }, [search, router]);

  const load = useCallback(async () => {
    try {
      const data = await api.sites.list();
      setSites(data);
    } catch {
      /* noop */
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await api.sites.delete(pendingDelete.id);
    setPendingDelete(null);
    load();
  };

  return (
    <>
      <div className="px-12 pt-12 pb-20 max-w-[1400px]">
        <div className="flex items-start justify-between gap-6 mb-2">
          <div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white">
              SEO<span className="text-emerald-400">.</span>
            </h1>
            <p className="text-slate-400 mt-3 text-sm max-w-xl">
              On-page audit for each site. We scan your homepage for tags, headings,
              alt text, structured data, and more — weekly, or whenever you click
              re-scan.
            </p>
          </div>

          <button
            onClick={() => setShowAdd(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 flex items-center gap-2 text-sm rounded-xl transition-colors shadow-lg shadow-indigo-900/30"
          >
            <PlusIcon className="w-4 h-4" />
            Add Site
          </button>
        </div>

        <div className="mt-10">
          <GoogleConnectCard banner={banner} />
        </div>

        {fetching ? (
          <div className="flex items-center justify-center py-40">
            <div className="w-8 h-8 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
          </div>
        ) : sites.length === 0 ? (
          <div className="mt-16 text-center bg-white/[0.02] border border-white/[0.06] rounded-3xl p-16">
            <h2 className="text-2xl font-bold text-white mb-2">
              No sites yet<span className="text-emerald-400">.</span>
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              Add your first site to run an on-page SEO audit.
            </p>
            <button
              onClick={() => setShowAdd(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 inline-flex items-center gap-2 text-sm rounded-xl transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Add Site
            </button>
          </div>
        ) : (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-3 backdrop-blur-sm">
            {sites.map((s) => {
              const snap = s.seoSnapshot;
              const scanning = !snap;
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-4 px-6 py-5 rounded-2xl hover:bg-white/[0.02] transition-colors group"
                >
                  <SeoScoreBadge score={snap?.score} size="md" />

                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/seo/detail?id=${s.id}`}
                      className="font-semibold text-white hover:text-emerald-400 transition-colors block truncate"
                    >
                      {s.name || s.url}
                    </Link>
                    <p className="text-slate-500 text-sm truncate">{s.url}</p>
                  </div>

                  <div className="hidden md:block text-right w-28">
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">
                      Issues
                    </p>
                    <p className="text-sm font-semibold text-white">
                      {snap?.issueCount ?? '—'}
                    </p>
                  </div>

                  <div className="hidden md:block text-right w-28">
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">
                      Last scan
                    </p>
                    <p className="text-sm font-semibold text-slate-300">
                      {scanning ? (
                        <span className="text-amber-400">Scanning…</span>
                      ) : (
                        timeAgo(snap.fetchedAt)
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setPendingDelete(s)}
                      title="Delete"
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAdd && (
        <AddSiteModal
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            load();
          }}
        />
      )}

      {pendingDelete && (
        <ConfirmModal
          intent="danger"
          title="Delete site?"
          description="This permanently removes the site and its SEO audit history. This action cannot be undone."
          confirmLabel="Delete"
          loadingLabel="Deleting…"
          target={{ name: pendingDelete.name || pendingDelete.url, url: pendingDelete.url }}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      )}
    </>
  );
}

export default function SeoIndexPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-40">
          <div className="w-8 h-8 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
        </div>
      }
    >
      <SeoIndexInner />
    </Suspense>
  );
}
