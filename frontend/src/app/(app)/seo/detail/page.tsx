'use client';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { SeoScoreBadge } from '@/components/seo/SeoScoreBadge';
import { IssuesList } from '@/components/seo/IssuesList';
import { ConfirmModal } from '@/components/dashboard/ConfirmModal';
import EditSiteModal from '@/components/seo/EditSiteModal';
import { AnalyticsCard } from '@/components/seo/AnalyticsCard';

function timeAgo(date: string | Date | null | undefined) {
  if (!date) return 'Never';
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-2 border-b border-white/[0.04] last:border-0">
      <p className="text-xs text-slate-500 uppercase tracking-wider w-44 flex-shrink-0 pt-0.5">
        {label}
      </p>
      <div className="flex-1 text-sm text-slate-200 break-words min-w-0">
        {value ?? <span className="text-slate-600">—</span>}
      </div>
    </div>
  );
}

function SiteDetailInner() {
  const search = useSearchParams();
  const router = useRouter();
  const id = search.get('id') ?? '';

  const [site, setSite] = useState<any>(null);
  const [fetching, setFetching] = useState(true);
  const [rescanning, setRescanning] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<any | null>(null);

  const load = useCallback(async () => {
    try {
      const s = await api.sites.get(id);
      setSite(s);
    } finally {
      setFetching(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [id, load]);

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    );
  }
  if (!site) {
    return <div className="p-8 text-slate-400">Site not found.</div>;
  }

  const snap = site.seoSnapshot;
  const details = snap?.details || {};
  const issues = (details.issues || []) as any[];

  const handleRescan = async () => {
    setRescanning(true);
    try {
      const updated = await api.sites.refreshSeo(id);
      setSite(updated);
    } finally {
      setRescanning(false);
    }
  };

  const handleDelete = async () => {
    await api.sites.delete(id);
    router.push('/seo');
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-slate-300 p-6 md:p-10 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-5">
          <SeoScoreBadge score={snap?.score} size="lg" />
          <div>
            <Link
              href="/seo"
              className="text-xs text-slate-500 hover:text-slate-300 uppercase tracking-widest"
            >
              ← All sites
            </Link>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {site.name || site.url}
              </h1>
              <a
                href={site.url}
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              <a href={site.url} className="text-emerald-400 hover:underline">
                {site.url}
              </a>
              {snap && (
                <>
                  <span className="mx-2 text-slate-600">·</span>
                  Scanned {timeAgo(snap.fetchedAt)}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRescan}
            disabled={rescanning}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {rescanning ? 'Re-scanning…' : 'Re-scan now'}
          </button>
          <button
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1a1d24] hover:bg-[#252830] border border-white/5 rounded-lg text-sm font-medium transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => setPendingDelete(site)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1a1d24] hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 rounded-lg text-sm font-medium text-slate-300 hover:text-red-400 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {!snap ? (
        <div className="bg-[#171a21] border border-white/[0.04] rounded-xl p-12 text-center">
          <div className="w-8 h-8 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">
            Running first audit… this usually takes a few seconds.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <AnalyticsCard siteId={site.id} hasProperty={Boolean(site.gaPropertyId)} />

            <div className="bg-[#171a21] border border-white/[0.04] rounded-xl p-6">
              <h3 className="font-bold text-white mb-4">
                Issues<span className="text-emerald-400">.</span>
              </h3>
              <IssuesList issues={issues} />
            </div>

            <div className="bg-[#171a21] border border-white/[0.04] rounded-xl p-6">
              <h3 className="font-bold text-white mb-4">
                Tags<span className="text-emerald-400">.</span>
              </h3>
              <Row label="Title" value={details.tags?.title} />
              <Row
                label="Title length"
                value={details.tags?.titleLength ? `${details.tags.titleLength} chars` : null}
              />
              <Row label="Meta description" value={details.tags?.metaDescription} />
              <Row
                label="Description length"
                value={
                  details.tags?.metaDescriptionLength
                    ? `${details.tags.metaDescriptionLength} chars`
                    : null
                }
              />
              <Row label="Canonical" value={details.tags?.canonical} />
              <Row label="Meta robots" value={details.tags?.metaRobots} />
              <Row label="Meta viewport" value={details.tags?.metaViewport} />
              <Row label="HTML lang" value={details.tags?.htmlLang} />
              <Row label="Charset" value={details.tags?.charset} />
            </div>

            <div className="bg-[#171a21] border border-white/[0.04] rounded-xl p-6">
              <h3 className="font-bold text-white mb-4">
                Open Graph<span className="text-emerald-400">.</span>
              </h3>
              <Row label="og:title" value={details.openGraph?.title} />
              <Row label="og:description" value={details.openGraph?.description} />
              <Row label="og:image" value={details.openGraph?.image} />
              <Row label="og:url" value={details.openGraph?.url} />
              <Row label="og:type" value={details.openGraph?.type} />
            </div>

            <div className="bg-[#171a21] border border-white/[0.04] rounded-xl p-6">
              <h3 className="font-bold text-white mb-4">
                Twitter Card<span className="text-emerald-400">.</span>
              </h3>
              <Row label="twitter:card" value={details.twitter?.card} />
              <Row label="twitter:title" value={details.twitter?.title} />
              <Row label="twitter:description" value={details.twitter?.description} />
              <Row label="twitter:image" value={details.twitter?.image} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-[#171a21] border border-white/[0.04] rounded-xl p-6">
              <h3 className="font-bold text-white mb-4">
                Headings<span className="text-emerald-400">.</span>
              </h3>
              <Row label="H1 count" value={details.headings?.h1Count} />
              <Row label="H1 text" value={details.headings?.h1FirstText} />
              <Row label="H2 count" value={details.headings?.h2Count} />
              <Row label="H3 count" value={details.headings?.h3Count} />
            </div>

            <div className="bg-[#171a21] border border-white/[0.04] rounded-xl p-6">
              <h3 className="font-bold text-white mb-4">
                Content<span className="text-emerald-400">.</span>
              </h3>
              <Row label="Word count" value={details.content?.wordCount} />
              <Row label="Internal links" value={details.links?.internal} />
              <Row label="External links" value={details.links?.external} />
              <Row label="Images" value={details.images?.total} />
              <Row
                label="Missing alt text"
                value={
                  details.images?.missingAlt != null
                    ? details.images.missingAlt
                    : null
                }
              />
              <Row
                label="HTML size"
                value={details.htmlBytes ? `${(details.htmlBytes / 1024).toFixed(1)} KB` : null}
              />
              <Row
                label="Fetch time"
                value={details.fetchTimeMs ? `${details.fetchTimeMs} ms` : null}
              />
            </div>

            <div className="bg-[#171a21] border border-white/[0.04] rounded-xl p-6">
              <h3 className="font-bold text-white mb-4">
                Crawl assets<span className="text-emerald-400">.</span>
              </h3>
              <Row
                label="robots.txt"
                value={
                  details.robots?.found ? (
                    <span className="text-emerald-400">Found</span>
                  ) : (
                    <span className="text-slate-500">Not found</span>
                  )
                }
              />
              <Row
                label="sitemap.xml"
                value={
                  details.sitemap?.found ? (
                    <span className="text-emerald-400">
                      Found ({details.sitemap?.urlCount ?? '?'} URLs)
                    </span>
                  ) : (
                    <span className="text-amber-400">Not found</span>
                  )
                }
              />
              <Row
                label="Structured data"
                value={
                  details.structuredData?.count > 0
                    ? `${details.structuredData.count} block(s): ${details.structuredData.types?.join(', ') || 'unknown'}`
                    : null
                }
              />
            </div>

            {!snap.fetchOk && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
                <h3 className="font-bold text-red-400 mb-2">Fetch failed</h3>
                <p className="text-sm text-slate-300">
                  {snap.fetchError || `HTTP ${snap.statusCode ?? '?'}`}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {showEdit && (
        <EditSiteModal
          site={site}
          onClose={() => setShowEdit(false)}
          onSaved={async () => {
            setShowEdit(false);
            await load();
          }}
        />
      )}

      {pendingDelete && (
        <ConfirmModal
          intent="danger"
          title="Delete site?"
          description="This permanently removes the site and its SEO audit. This action cannot be undone."
          confirmLabel="Delete"
          loadingLabel="Deleting…"
          target={{ name: pendingDelete.name || pendingDelete.url, url: pendingDelete.url }}
          onCancel={() => setPendingDelete(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

export default function SiteDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
        </div>
      }
    >
      <SiteDetailInner />
    </Suspense>
  );
}
