'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type User = {
  id: string;
  email: string;
  username: string | null;
  name: string | null;
  isSuperuser: boolean;
};

type Props = {
  user?: User | null;
  onClose: () => void;
  onSaved: (user: User) => void;
};

export function UserModal({ user, onClose, onSaved }: Props) {
  const isEdit = !!user;
  const [email, setEmail] = useState(user?.email ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [name, setName] = useState(user?.name ?? '');
  const [password, setPassword] = useState('');
  const [isSuperuser, setIsSuperuser] = useState(user?.isSuperuser ?? false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEmail(user?.email ?? '');
    setUsername(user?.username ?? '');
    setName(user?.name ?? '');
    setPassword('');
    setIsSuperuser(user?.isSuperuser ?? false);
    setError(null);
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      let saved: User;
      if (isEdit && user) {
        saved = await api.users.update(user.id, {
          email,
          name: name || undefined,
          username: username || undefined,
          password: password || undefined,
          isSuperuser,
        });
      } else {
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters');
        }
        saved = await api.users.create({
          email,
          password,
          name: name || undefined,
          username: username || undefined,
          isSuperuser,
        });
      }
      onSaved(saved);
    } catch (err: any) {
      setError(err?.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-[#171a21] border border-white/10 rounded-2xl shadow-2xl">
        <form onSubmit={submit}>
          <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">
              {isEdit ? 'Edit user' : 'Create user'}
              <span className="text-emerald-400">.</span>
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-500 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-2.5 text-sm">
                {error}
              </div>
            )}

            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500/50"
              />
            </Field>

            <Field label="Username">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500/50"
              />
            </Field>

            <Field label="Name">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500/50"
              />
            </Field>

            <Field label={isEdit ? 'New password (leave blank to keep)' : 'Password'}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!isEdit}
                minLength={isEdit ? 0 : 8}
                placeholder={isEdit ? '••••••••' : 'min 8 characters'}
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500/50"
              />
            </Field>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isSuperuser}
                onChange={(e) => setIsSuperuser(e.target.checked)}
                className="w-4 h-4 accent-emerald-500"
              />
              <span className="text-sm text-slate-300">
                Superuser <span className="text-slate-500">— can manage all users</span>
              </span>
            </label>
          </div>

          <div className="px-6 py-4 border-t border-white/5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white transition-colors"
            >
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create user'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}
