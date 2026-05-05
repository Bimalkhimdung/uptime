'use client';
import { useState } from 'react';
import { api } from '@/lib/api';

interface Props {
  monitor: {
    id: string;
    name: string;
    url: string;
    interval: number;
    timeout: number;
    alertContacts?: Array<{ id: string; type: string; value: string }>;
  };
  onClose: () => void;
  onSaved: () => void;
}

const INTERVALS = [1, 5, 10, 15, 30, 60];
const TIMEOUTS = [5, 10, 15, 20, 30];

export default function EditMonitorModal({ monitor, onClose, onSaved }: Props) {
  const [name, setName] = useState(monitor.name);
  const [url, setUrl] = useState(monitor.url);
  const [interval, setIntervalValue] = useState(monitor.interval);
  const [timeout, setTimeoutValue] = useState(monitor.timeout);
  const [emails, setEmails] = useState<string[]>(
    (monitor.alertContacts ?? [])
      .filter((c) => c.type === 'EMAIL')
      .map((c) => c.value),
  );
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addEmail = () => {
    const v = newEmail.trim();
    if (!v) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setError('Please enter a valid email address');
      return;
    }
    if (emails.includes(v)) {
      setNewEmail('');
      return;
    }
    setEmails([...emails, v]);
    setNewEmail('');
    setError('');
  };

  const removeEmail = (value: string) => {
    setEmails(emails.filter((e) => e !== value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.monitors.update(monitor.id, {
        name,
        url,
        interval,
        timeout,
        alertEmails: emails,
      });
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to update monitor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-[#111118] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
          <h2 className="font-semibold text-white text-lg">Edit Monitor</h2>
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
              Monitor Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Check Interval
              </label>
              <select
                value={interval}
                onChange={(e) => setIntervalValue(Number(e.target.value))}
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
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Timeout (seconds)
              </label>
              <select
                value={timeout}
                onChange={(e) => setTimeoutValue(Number(e.target.value))}
                className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
              >
                {TIMEOUTS.map((t) => (
                  <option key={t} value={t} className="bg-[#111118]">
                    {t}s
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Alert Emails
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Recipients notified when this monitor goes down or recovers.
            </p>
            {emails.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {emails.map((e) => (
                  <span
                    key={e}
                    className="inline-flex items-center gap-1.5 bg-violet-500/10 border border-violet-500/30 text-violet-200 text-xs rounded-full pl-3 pr-2 py-1"
                  >
                    {e}
                    <button
                      type="button"
                      onClick={() => removeEmail(e)}
                      className="text-violet-300/70 hover:text-white text-base leading-none"
                      aria-label={`Remove ${e}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addEmail();
                  }
                }}
                placeholder="alerts@yourcompany.com"
                className="flex-1 bg-white/[0.06] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
              />
              <button
                type="button"
                onClick={addEmail}
                className="px-4 py-2.5 border border-white/10 hover:border-white/20 text-slate-200 text-sm rounded-lg transition-colors"
              >
                Add
              </button>
            </div>
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
