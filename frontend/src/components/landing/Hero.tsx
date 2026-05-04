import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative pt-40 pb-20 px-6">
      <div className="max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs font-semibold text-violet-400 mb-10 animate-fade-in">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          Real-time Monitoring
        </div>

        <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-8 leading-[1.05] bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
          Uptime monitoring <br />
          <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-blue-400 bg-clip-text text-transparent italic">
            done right.
          </span>
        </h1>

        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
          Stop losing customers to downtime. Get notified instantly when your site goes down with beautiful reports and global checks.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
          <Link
            href="/register"
            className="w-full sm:w-auto bg-violet-600 hover:bg-violet-500 text-white font-bold px-10 py-4 rounded-2xl text-lg shadow-[0_0_30px_rgba(124,58,237,0.3)] hover:shadow-[0_0_40px_rgba(124,58,237,0.5)] transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            Start for free
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto border border-white/10 hover:bg-white/5 text-white/80 hover:text-white font-semibold px-10 py-4 rounded-2xl text-lg transition-all"
          >
            Live Demo
          </Link>
        </div>
      </div>
    </section>
  );
}
