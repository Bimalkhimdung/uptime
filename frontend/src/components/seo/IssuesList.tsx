type Severity = 'error' | 'warn' | 'info';
type Issue = { severity: Severity; code: string; message: string };

const SEVERITY_META: Record<
  Severity,
  { label: string; dot: string; text: string; bg: string }
> = {
  error: {
    label: 'Errors',
    dot: 'bg-red-400',
    text: 'text-red-400',
    bg: 'bg-red-500/5 border-red-500/15',
  },
  warn: {
    label: 'Warnings',
    dot: 'bg-amber-400',
    text: 'text-amber-400',
    bg: 'bg-amber-500/5 border-amber-500/15',
  },
  info: {
    label: 'Info',
    dot: 'bg-slate-400',
    text: 'text-slate-400',
    bg: 'bg-white/[0.02] border-white/[0.06]',
  },
};

const ORDER: Severity[] = ['error', 'warn', 'info'];

export function IssuesList({ issues }: { issues: Issue[] }) {
  if (!issues || issues.length === 0) {
    return (
      <div className="text-sm text-slate-400">
        No issues detected. <span className="text-emerald-400">Nice work.</span>
      </div>
    );
  }

  const grouped: Record<Severity, Issue[]> = { error: [], warn: [], info: [] };
  for (const i of issues) grouped[i.severity]?.push(i);

  return (
    <div className="space-y-4">
      {ORDER.map((sev) => {
        const list = grouped[sev];
        if (!list || list.length === 0) return null;
        const meta = SEVERITY_META[sev];
        return (
          <div key={sev}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
              <h4 className={`text-xs font-bold uppercase tracking-widest ${meta.text}`}>
                {meta.label} ({list.length})
              </h4>
            </div>
            <div className="space-y-2">
              {list.map((i, idx) => (
                <div
                  key={`${i.code}-${idx}`}
                  className={`px-4 py-3 rounded-lg border text-sm ${meta.bg}`}
                >
                  <p className="text-white">{i.message}</p>
                  <p className="text-xs text-slate-500 mt-1 font-mono">{i.code}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
