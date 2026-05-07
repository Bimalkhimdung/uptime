'use client';
import { useState } from 'react';
import { api } from '@/lib/api';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const INTERVALS = [1, 5, 10, 15, 30, 60];

export default function AddMonitorModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('https://');
  const [interval, setInterval] = useState(5);
  const [timeout, setTimeout] = useState(10);
  const [alertEmail, setAlertEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.monitors.create({ name, url, interval, timeout, alertEmail: alertEmail || undefined });
      onCreated();
    } catch (err: any) {
      setError(err.message || 'Failed to create monitor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:px-4 overflow-y-auto py-0 sm:py-6">
      <div className="bg-[#111118] border border-white/10 rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl shadow-black/60 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-white/8 sticky top-0 bg-[#111118] z-10">
          <h2 className="font-semibold text-white text-base sm:text-lg">Add Monitor</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 sm:space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Monitor Name</label>
            <input
              id="monitor-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="My Website"
              className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">URL</label>
            <input
              id="monitor-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              placeholder="https://example.com"
              className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Check Interval</label>
              <select
                id="monitor-interval"
                value={interval}
                onChange={(e) => setInterval(Number(e.target.value))}
                className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
              >
                {INTERVALS.map((i) => (
                  <option key={i} value={i} className="bg-[#111118]">
                    {i} min{i > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Timeout (seconds)</label>
              <select
                id="monitor-timeout"
                value={timeout}
                onChange={(e) => setTimeout(Number(e.target.value))}
                className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
              >
                {[5, 10, 15, 20, 30].map((t) => (
                  <option key={t} value={t} className="bg-[#111118]">
                    {t}s
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Alert Email <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <input
              id="monitor-alert-email"
              type="email"
              value={alertEmail}
              onChange={(e) => setAlertEmail(e.target.value)}
              placeholder="alerts@yourcompany.com"
              className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
            />
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
              id="create-monitor-btn"
              type="submit"
              disabled={loading}
              className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 transition-all text-white font-semibold py-2.5 rounded-xl text-sm"
            >
              {loading ? 'Creating…' : 'Create Monitor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
