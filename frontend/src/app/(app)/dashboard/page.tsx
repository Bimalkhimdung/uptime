'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import AddMonitorModal from '@/components/AddMonitorModal';
import { MonitorsEmptyState } from '@/components/dashboard/MonitorsEmptyState';
import { MonitorRow } from '@/components/dashboard/MonitorRow';
import { ConfirmModal } from '@/components/dashboard/ConfirmModal';
import { PlusIcon, ChevronDownIcon } from '@/components/dashboard/icons';

export default function DashboardPage() {
  const [monitors, setMonitors] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<any | null>(null);
  const [pendingPause, setPendingPause] = useState<any | null>(null);

  const loadMonitors = useCallback(async () => {
    try {
      const data = await api.monitors.list();
      setMonitors(data);
    } catch {
      /* noop */
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    loadMonitors();
    const interval = setInterval(loadMonitors, 30000);
    return () => clearInterval(interval);
  }, [loadMonitors]);

  const handleDelete = (id: string) => {
    const monitor = monitors.find((m) => m.id === id);
    if (monitor) setPendingDelete(monitor);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await api.monitors.delete(pendingDelete.id);
    setPendingDelete(null);
    loadMonitors();
  };

  const handleToggle = async (m: any) => {
    if (m.isActive) {
      setPendingPause(m);
      return;
    }
    await api.monitors.resume(m.id);
    loadMonitors();
  };

  const confirmPause = async () => {
    if (!pendingPause) return;
    await api.monitors.pause(pendingPause.id);
    setPendingPause(null);
    loadMonitors();
  };

  return (
    <>
      <div className="px-12 pt-12 pb-20 max-w-[1400px]">
        <div className="flex items-start justify-between gap-6 mb-2">
          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white">
            Monitors<span className="text-emerald-400">.</span>
          </h1>

          <div className="flex items-stretch rounded-xl overflow-hidden shadow-lg shadow-indigo-900/30">
            <button
              onClick={() => setShowAdd(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 flex items-center gap-2 text-sm transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              New
            </button>
            <button
              type="button"
              aria-label="More options"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 border-l border-indigo-500/40 transition-colors"
            >
              <ChevronDownIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {fetching ? (
          <div className="flex items-center justify-center py-40">
            <div className="w-8 h-8 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
          </div>
        ) : monitors.length === 0 ? (
          <MonitorsEmptyState onCreate={() => setShowAdd(true)} />
        ) : (
          <div className="mt-12 bg-white/[0.02] border border-white/[0.06] rounded-3xl p-3 backdrop-blur-sm">
            {monitors.map((m) => (
              <MonitorRow
                key={m.id}
                monitor={m}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <AddMonitorModal
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            loadMonitors();
          }}
        />
      )}

      {pendingDelete && (
        <ConfirmModal
          intent="danger"
          title="Delete monitor?"
          description="This permanently removes the monitor and all its checks, incidents, and alert contacts. This action cannot be undone."
          confirmLabel="Delete"
          loadingLabel="Deleting…"
          target={{ name: pendingDelete.name, url: pendingDelete.url }}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      )}

      {pendingPause && (
        <ConfirmModal
          intent="warning"
          title="Pause monitoring?"
          description="Checks will stop running and you won't receive alerts for this monitor until you resume it."
          confirmLabel="Pause"
          loadingLabel="Pausing…"
          target={{ name: pendingPause.name, url: pendingPause.url }}
          onCancel={() => setPendingPause(null)}
          onConfirm={confirmPause}
        />
      )}
    </>
  );
}
