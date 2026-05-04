const STATS = [
  { value: '1 min', label: 'Monitoring interval', icon: '⏱️' },
  { value: '99.9%', label: 'Uptime guarantee', icon: '💎' },
  { value: '< 2s', label: 'Alert delivery speed', icon: '🚀' },
];

export function Stats() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 text-center hover:bg-white/[0.04] transition-all hover:border-white/10 group"
          >
            <div className="text-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
              {stat.icon}
            </div>
            <div className="text-4xl font-black text-white mb-2">{stat.value}</div>
            <div className="text-slate-500 text-sm font-semibold uppercase tracking-widest">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
