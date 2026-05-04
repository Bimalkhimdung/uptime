export function Hero() {
  return (
    <section className="relative pt-40 pb-32 px-6 overflow-hidden">
      <div className="max-w-5xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs font-semibold text-violet-400 mb-10 animate-fade-in">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          Real-time Monitoring
        </div>

        <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-8 leading-[1.05] bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
          Uptime monitoring <br />
          <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent italic">
            done right.
          </span>
        </h1>

        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
          Stop losing customers to downtime. Get notified instantly when your site goes down with beautiful reports and global checks.
        </p>

        {/* Dashboard Screenshot Graphic */}
        <div className="relative max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-2xl shadow-emerald-500/10 border border-white/10 transform perspective-1000 rotate-x-12 scale-105 hover:rotate-x-0 transition-transform duration-1000 ease-out">
          <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#030303] z-10" />
          <img
            src="/logo/background.png"
            alt="Uptime dashboard preview"
            className="w-full h-auto"
          />
        </div>
      </div>
    </section>
  );
}
