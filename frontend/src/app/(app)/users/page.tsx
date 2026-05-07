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
  lastLoginAt: string | null;
  createdAt: string;
  monitorDomains: string[];
  seoDomains: string[];
};

function timeAgo(date: string | null) {
  if (!date) return 'Never';
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}

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
      <div className="px-4 sm:px-6 lg:px-12 pt-8 lg:pt-12 pb-20 w-full max-w-[1600px]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8 lg:mb-12">
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

        {/* Mobile / tablet card layout */}
        <div className="xl:hidden space-y-3">
          {users.length === 0 ? (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl py-16 text-center text-slate-500 text-sm">
              No users.
            </div>
          ) : (
            users.map((u) => (
              <UserCard
                key={u.id}
                user={u}
                isYou={u.id === currentUser.id}
                onEdit={() => setEditing(u)}
              />
            ))
          )}
        </div>

        {/* Desktop table layout */}
        <div className="hidden xl:block bg-white/[0.02] border border-white/[0.06] rounded-3xl overflow-hidden">
          {users.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">No users.</div>
          ) : (
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col className="w-[18%]" />
                <col className="w-[14%]" />
                <col className="w-[16%]" />
                <col className="w-[16%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[6%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  <th className="text-left font-bold px-4 lg:px-6 py-3">Email</th>
                  <th className="text-left font-bold px-3 py-3">Username / name</th>
                  <th className="text-left font-bold px-3 py-3">Monitors</th>
                  <th className="text-left font-bold px-3 py-3">SEO</th>
                  <th className="text-left font-bold px-3 py-3">Role</th>
                  <th className="text-left font-bold px-3 py-3">Last login</th>
                  <th className="text-left font-bold px-3 py-3">Created</th>
                  <th className="px-4 lg:px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors align-middle"
                  >
                    <td className="px-4 lg:px-6 py-4 min-w-0">
                      <p className="text-sm text-white truncate">{u.email}</p>
                      {u.id === currentUser.id && (
                        <p className="text-[10px] uppercase tracking-widest text-emerald-400 mt-0.5">
                          You
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-4 min-w-0">
                      <p className="text-sm text-slate-300 truncate">
                        {u.username || <span className="text-slate-600">—</span>}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {u.name || <span className="text-slate-600">—</span>}
                      </p>
                    </td>
                    <td className="px-3 py-4">
                      <DomainsCell domains={u.monitorDomains} emptyLabel="No monitors" />
                    </td>
                    <td className="px-3 py-4">
                      <DomainsCell domains={u.seoDomains} emptyLabel="No SEO sites" />
                    </td>
                    <td className="px-3 py-4">
                      {u.isSuperuser ? (
                        <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Superuser
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">User</span>
                      )}
                    </td>
                    <td
                      className={`px-3 py-4 text-xs ${u.lastLoginAt ? 'text-slate-300' : 'text-slate-600'}`}
                      title={u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never signed in'}
                    >
                      {timeAgo(u.lastLoginAt)}
                    </td>
                    <td className="px-3 py-4 text-xs text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-right">
                      <button
                        onClick={() => setEditing(u)}
                        className="text-xs font-semibold text-violet-400 hover:text-violet-300 px-3 py-1.5 rounded-lg hover:bg-violet-500/10 transition-colors"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

function UserCard({
  user: u,
  isYou,
  onEdit,
}: {
  user: User;
  isYou: boolean;
  onEdit: () => void;
}) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-white truncate">{u.email}</p>
            {isYou && (
              <span className="text-[9px] uppercase tracking-widest text-emerald-400 font-bold flex-shrink-0">
                You
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1 truncate">
            {u.username || <span className="text-slate-600">no username</span>}
            {u.name ? <span className="text-slate-600"> · {u.name}</span> : null}
          </p>
        </div>
        {u.isSuperuser ? (
          <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Superuser
          </span>
        ) : (
          <span className="text-[11px] text-slate-500 flex-shrink-0">User</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <CardField label="Monitors">
          <DomainsCell domains={u.monitorDomains} emptyLabel="No monitors" />
        </CardField>
        <CardField label="SEO">
          <DomainsCell domains={u.seoDomains} emptyLabel="No SEO sites" />
        </CardField>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/[0.04]">
        <div className="flex gap-5 text-[11px]">
          <div>
            <p className="text-slate-600 uppercase tracking-widest font-bold mb-0.5">Last login</p>
            <p
              className={u.lastLoginAt ? 'text-slate-300' : 'text-slate-600'}
              title={u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never signed in'}
            >
              {timeAgo(u.lastLoginAt)}
            </p>
          </div>
          <div>
            <p className="text-slate-600 uppercase tracking-widest font-bold mb-0.5">Created</p>
            <p className="text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <button
          onClick={onEdit}
          className="text-xs font-semibold text-violet-400 hover:text-violet-300 px-3 py-1.5 rounded-lg hover:bg-violet-500/10 transition-colors flex-shrink-0"
        >
          Edit
        </button>
      </div>
    </div>
  );
}

function CardField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold mb-1.5">
        {label}
      </p>
      {children}
    </div>
  );
}

function DomainsCell({
  domains,
  emptyLabel,
}: {
  domains: string[];
  emptyLabel: string;
}) {
  if (domains.length === 0) {
    return <span className="text-xs text-slate-600" title={emptyLabel}>—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1 min-w-0" title={domains.join('\n')}>
      {domains.slice(0, 2).map((d) => (
        <span
          key={d}
          className="inline-block bg-white/[0.04] border border-white/[0.06] text-slate-300 text-[11px] px-2 py-0.5 rounded-md font-mono truncate max-w-full"
        >
          {d}
        </span>
      ))}
      {domains.length > 2 && (
        <span className="inline-block text-slate-500 text-[11px] px-1 py-0.5 font-semibold">
          +{domains.length - 2}
        </span>
      )}
    </div>
  );
}
