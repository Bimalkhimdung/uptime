import Link from 'next/link';

export function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] bg-[#0a1110]/70 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
          <span className="font-bold text-lg tracking-tight text-white/90">Uptime</span>
        </Link>

        <div className="flex items-center gap-6">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="bg-white text-black hover:bg-white/90 px-4 py-2 rounded-full text-sm font-semibold transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-95"
          >
            Get started free
          </Link>
        </div>
      </div>
    </nav>
  );
}
