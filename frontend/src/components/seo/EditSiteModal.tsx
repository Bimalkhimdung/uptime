'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Props {
  site: { id: string; name: string | null; url: string; gaPropertyId: string | null };
  onClose: () => void;
  onSaved: () => void;
}

type Property = {
  property: string;
  displayName: string;
  account: string | null;
  accountDisplayName: string | null;
};

export default function EditSiteModal({ site, onClose, onSaved }: Props) {
  const [name, setName] = useState(site.name || '');
  const [url, setUrl] = useState(site.url);
  const [gaPropertyId, setGaPropertyId] = useState<string>(site.gaPropertyId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertiesError, setPropertiesError] = useState<string>('');
  const [loadingProperties, setLoadingProperties] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const status = await api.google.status();
        if (cancel) return;
        setGoogleConnected(status.connected);
        if (!status.connected) return;
        setLoadingProperties(true);
        const props = await api.google.properties();
        if (cancel) return;
        setProperties(props);
      } catch (err: any) {
        if (!cancel) setPropertiesError(err.message || 'Failed to load GA4 properties');
      } finally {
        if (!cancel) setLoadingProperties(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.sites.update(site.id, {
        name: name || undefined,
        url,
        gaPropertyId: gaPropertyId === '' ? null : gaPropertyId,
      });
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to update site');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-[#111118] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
          <h2 className="font-semibold text-white text-lg">Edit Site</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Site Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              Changing the URL triggers an immediate re-scan.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              GA4 Property
            </label>
            {googleConnected === null ? (
              <p className="text-xs text-slate-500">Checking Google connection…</p>
            ) : !googleConnected ? (
              <p className="text-xs text-slate-500">
                Connect Google on the SEO index page to enable analytics.
              </p>
            ) : loadingProperties ? (
              <p className="text-xs text-slate-500">Loading your GA4 properties…</p>
            ) : propertiesError ? (
              <p className="text-xs text-red-400">{propertiesError}</p>
            ) : properties.length === 0 ? (
              <p className="text-xs text-slate-500">
                No GA4 properties found on this Google account.
              </p>
            ) : (
              <>
                <select
                  value={gaPropertyId}
                  onChange={(e) => setGaPropertyId(e.target.value)}
                  className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                >
                  <option value="" className="bg-[#111118]">
                    — Not linked —
                  </option>
                  {properties.map((p) => (
                    <option key={p.property} value={p.property} className="bg-[#111118]">
                      {p.displayName}
                      {p.accountDisplayName ? ` · ${p.accountDisplayName}` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1.5">
                  Pick the GA4 property whose data should appear on this site&apos;s page.
                </p>
              </>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-colors py-2.5 rounded-xl text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 transition-all text-white font-semibold py-2.5 rounded-xl text-sm"
            >
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
