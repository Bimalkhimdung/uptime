type Props = {
  onCreate: () => void;
};

export function MonitorsEmptyState({ onCreate }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,520px)] gap-12 items-start mt-16">
      <div className="max-w-xl">
        <h2 className="text-5xl md:text-6xl font-black tracking-tight leading-[1.05] mb-10">
          <span className="text-emerald-400">Monitor</span>{' '}
          <span className="text-white">your website in a click.</span>
        </h2>
        <p className="text-slate-300 text-lg leading-relaxed mb-6">
          Keep an eye on your{' '}
          <span className="text-emerald-400 underline underline-offset-4 decoration-emerald-400/40">
            website, API, email service
          </span>
          , or any{' '}
          <span className="text-emerald-400 underline underline-offset-4 decoration-emerald-400/40">
            port
          </span>{' '}
          or{' '}
          <span className="text-emerald-400 underline underline-offset-4 decoration-emerald-400/40">
            device on the network
          </span>
          . Ping our servers to track cron jobs and stay on top of critical incidents.
        </p>
        <p className="text-slate-300 text-lg leading-relaxed mb-10">
          Get started now, all set up in under 30 seconds!{' '}
          <span aria-hidden>⚡</span>
        </p>
        <button
          onClick={onCreate}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-7 py-3.5 rounded-xl text-base transition-colors shadow-lg shadow-indigo-900/30"
        >
          Create your first monitor
        </button>
      </div>

      <MonitorListMock />
    </div>
  );
}

function MonitorListMock() {
  const rows = [
    { state: 'down', sub: 'Up 386 d' },
    { state: 'maint', sub: 'Under maintenance 5min, 35sec' },
    { state: 'up', sub: 'Up 48 h, 23 m' },
    { state: 'up', sub: 'Up 386 d' },
    { state: 'up', sub: 'Up 386 d' },
    { state: 'paused', sub: 'Up 386 d' },
  ] as const;

  const dot = (state: typeof rows[number]['state']) => {
    switch (state) {
      case 'down':
        return <span className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px]">▼</span>;
      case 'maint':
        return <span className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-white text-[10px]">!</span>;
      case 'up':
        return <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px]">▲</span>;
      case 'paused':
        return <span className="w-5 h-5 rounded-full bg-slate-500 flex items-center justify-center text-white text-[10px]">‖</span>;
    }
  };

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-3 backdrop-blur-sm">
      <div className="space-y-1">
        {rows.map((r, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-4 rounded-2xl hover:bg-white/[0.02] transition-colors"
          >
            {dot(r.state)}
            <div className="flex-1 min-w-0">
              <div className="h-3 rounded-full bg-white/5 w-2/3 mb-2" />
              <p className="text-slate-500 text-sm">{r.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
