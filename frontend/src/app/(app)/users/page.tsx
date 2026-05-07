'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { UserModal } from '@/components/dashboard/UserModal';
import { PlusIcon } from '@/components/dashboard/icons';

type User = {
  id: string;
  email: string;
  username: string | null;
  name: string | null;
  isSuperuser: boolean;
  createdAt: string;
};

export default function UsersPage() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [fetching, setFetching] = useState(true);
  const [editing, setEditing] = useState<User | null | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      const data = await api.users.list();
      setUsers(data);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser?.isSuperuser) {
      router.replace('/dashboard');
      return;
    }
    load();
  }, [authLoading, currentUser, router, load]);

  if (authLoading || fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser?.isSuperuser) return null;

  return (
    <>
      <div className="px-12 pt-12 pb-20 max-w-[1400px]">
        <div className="flex items-start justify-between gap-6 mb-12">
          <div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white">
              Users<span className="text-emerald-400">.</span>
            </h1>
            <p className="text-slate-400 mt-3 text-sm max-w-xl">
              Manage every user on the system. Promote to superuser to grant the
              same admin access you have.
            </p>
          </div>

          <button
            onClick={() => setEditing(null)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 flex items-center gap-2 text-sm rounded-xl transition-colors shadow-lg shadow-indigo-900/30"
          >
            <PlusIcon className="w-4 h-4" />
            New user
          </button>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl overflow-hidden">
          <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-4 px-6 py-3 border-b border-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-600">
            <div>Email</div>
            <div>Username / name</div>
            <div>Role</div>
            <div>Created</div>
            <div />
          </div>

          {users.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">No users.</div>
          ) : (
            users.map((u) => (
              <div
                key={u.id}
                className="grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-4 px-6 py-4 items-center border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{u.email}</p>
                  {u.id === currentUser.id && (
                    <p className="text-[10px] uppercase tracking-widest text-emerald-400 mt-0.5">
                      You
                    </p>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-slate-300 truncate">
                    {u.username || <span className="text-slate-600">—</span>}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {u.name || <span className="text-slate-600">—</span>}
                  </p>
                </div>
                <div>
                  {u.isSuperuser ? (
                    <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Superuser
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">User</span>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  {new Date(u.createdAt).toLocaleDateString()}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setEditing(u)}
                    className="text-xs font-semibold text-violet-400 hover:text-violet-300 px-3 py-1.5 rounded-lg hover:bg-violet-500/10 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {editing !== undefined && (
        <UserModal
          user={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            load();
          }}
        />
      )}
    </>
  );
}
