'use client';
import { useState } from 'react';
import { api } from '@/lib/api';

interface Props {
  onClose: () => void;
  onCreated: (site: any) => void;
}

export default function AddSiteModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('https://');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const site = await api.sites.create({ name: name || undefined, url });
      onCreated(site);
    } catch (err: any) {
      setError(err.message || 'Failed to add site');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-[#111118] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
          <h2 className="font-semibold text-white text-lg">Add Site</h2>
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
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Site Name <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Marketing Site"
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
              placeholder="https://example.com"
              className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              We&apos;ll scan this page for SEO issues. Re-scans run weekly automatically.
            </p>
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
              {loading ? 'Adding…' : 'Add Site'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
