export function Logos() {
  const logos = [
    { name: 'intel', icon: '⚡' },
    { name: 'Moody\'s', icon: '📊' },
    { name: 'RMIT', icon: '🏛️' },
    { name: 'Square', icon: '⬛' },
    { name: 'Accenture', icon: '⧁' },
    { name: 'GitLab', icon: '🦊' },
    { name: 'HPE', icon: '🖨️' },
    { name: 'Netflix', icon: '🎬' },
    { name: 'Stripe', icon: '💳' },
    { name: 'Spotify', icon: '🎵' },
  ];

  // Double the logos for seamless loop
  const displayLogos = [...logos, ...logos];

  return (
    <section className="py-12 px-6 relative overflow-hidden bg-white/[0.01] border-y border-white/5">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-slate-500 mb-8 opacity-50">
          Trusted by innovators worldwide
        </p>

        <div className="relative w-full overflow-hidden">
          {/* Gradient Masks */}
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#030303] to-transparent z-10" />
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#030303] to-transparent z-10" />

          <div className="flex gap-8 md:gap-16 items-center animate-marquee whitespace-nowrap">
            {displayLogos.map((logo, i) => (
              <div
                key={i}
                className="flex items-center gap-3 grayscale opacity-30 hover:grayscale-0 hover:opacity-100 transition-all duration-500 cursor-default group"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">{logo.icon}</span>
                <span className="text-xl font-black text-white tracking-tighter italic">
                  {logo.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
