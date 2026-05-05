import Link from 'next/link';

export function CTA() {
  return (
    <section className="py-40 px-6 relative overflow-hidden">
      {/* Background Mockup Decoration */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
        <div className="relative w-full max-w-6xl aspect-[16/10] bg-[#011a14] border border-emerald-900/30 rounded-[3rem] rotate-[15deg] skew-x-[-10deg] scale-125 translate-y-32 blur-[2px] shadow-[0_50px_100px_rgba(0,0,0,0.5)]">
          {/* Mock Dashboard Content */}
          <div className="p-8 h-full flex flex-col gap-8">
            <div className="h-12 w-48 bg-emerald-900/20 rounded-xl" />
            <div className="flex-1 grid grid-cols-4 gap-6">
              <div className="col-span-1 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 w-full bg-emerald-900/20 rounded-lg" />
                ))}
              </div>
              <div className="col-span-3 bg-emerald-900/10 rounded-3xl border border-emerald-800/20 p-8">
                <div className="h-full w-full bg-gradient-to-t from-emerald-500/10 to-transparent rounded-2xl border-b-2 border-emerald-500/20" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10 text-center">
        {/* Rating Card */}
        <div className="inline-flex flex-col sm:flex-row items-center gap-4 sm:gap-8 px-6 sm:px-8 py-4 bg-white/[0.03] border border-white/10 backdrop-blur-xl rounded-2xl mb-12 shadow-2xl">
          <div className="text-center sm:text-left sm:border-r border-white/10 sm:pr-8">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 mb-1">
              <span className="text-xl font-black text-white">4.7</span>
              <span className="text-emerald-400">★</span>
            </div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">stars out of 5</p>
          </div>
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 mb-1">
              <span className="text-xl font-black text-white">265+</span>
            </div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">reviews on Google</p>
          </div>
        </div>

        <h2 className="text-4xl sm:text-5xl md:text-8xl font-black text-white mb-8 leading-[1.1] tracking-tight">
          Start monitoring <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">
            in 30 seconds.
          </span>
        </h2>

        <p className="text-slate-400 text-base md:text-xl max-w-2xl mx-auto mb-12 font-medium">
          There&apos;s nothing to install. No credit card required. <br className="hidden md:block" />
          50 monitors for free, forever.
        </p>

        <Link
          href="/register"
          className="inline-flex items-center justify-center bg-gradient-to-br from-emerald-400 to-emerald-600 text-black font-black px-10 md:px-12 py-5 md:py-6 rounded-2xl md:rounded-3xl text-lg md:text-xl hover:shadow-[0_0_50px_rgba(52,211,153,0.3)] transition-all hover:scale-105 active:scale-95"
        >
          Get started free
        </Link>
      </div>
    </section>
  );
}
