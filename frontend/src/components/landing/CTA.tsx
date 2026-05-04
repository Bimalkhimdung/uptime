import Link from 'next/link';

export function CTA() {
  return (
    <section className="py-40 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="relative bg-gradient-to-br from-violet-600 to-indigo-700 rounded-[3rem] p-16 md:p-24 overflow-hidden text-center shadow-[0_0_50px_rgba(124,58,237,0.2)]">
          <h2 className="relative z-10 text-4xl md:text-6xl font-black text-white mb-8 leading-tight">
            Ready to eliminate <br /> downtime?
          </h2>
          <p className="relative z-10 text-violet-100 text-lg md:text-xl max-w-xl mx-auto mb-12 font-medium opacity-90">
            Join thousands of developers who trust Uptime for their mission-critical services.
          </p>

          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto bg-white text-black font-black px-10 py-5 rounded-2xl text-lg hover:bg-white/90 transition-all hover:scale-105 active:scale-95 shadow-xl"
            >
              Create free account
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
