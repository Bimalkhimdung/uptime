import { FEATURES } from './features';

export function Features() {
  return (
    <section className="py-32 px-6 relative">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4 italic tracking-tight">
            Everything you need.
          </h2>
          <p className="text-slate-400 font-medium">
            Engineered for speed, reliability, and simplicity.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group relative bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-10 overflow-hidden hover:bg-white/[0.04] transition-all duration-500 hover:border-white/10"
            >
              <div
                className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${f.color} blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
              />

              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-2xl mb-8 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-4 group-hover:text-violet-300 transition-colors">
                  {f.title}
                </h3>
                <p className="text-slate-400 text-base leading-relaxed font-medium">
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
