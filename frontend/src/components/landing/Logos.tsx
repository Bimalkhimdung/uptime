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
    <section className="py-24 px-6 relative overflow-hidden bg-[#0a1110]">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-emerald-500/5 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto flex flex-col items-center relative z-10">
        <div className="flex items-center gap-6 mb-16 group">
          <div className="h-px w-12 bg-gradient-to-r from-transparent via-emerald-500/20 to-emerald-500/50" />
          <p className="text-[12px] uppercase tracking-[0.5em] font-extrabold text-emerald-500/90 drop-shadow-sm">
            Trusted by innovators worldwide
          </p>
          <div className="h-px w-12 bg-gradient-to-l from-transparent via-emerald-500/20 to-emerald-500/50" />
        </div>

        <div className="relative w-full overflow-hidden">
          {/* Enhanced Gradient Masks */}
          <div className="absolute inset-y-0 left-0 w-64 bg-gradient-to-r from-[#0a1110] via-[#0a1110]/90 to-transparent z-10" />
          <div className="absolute inset-y-0 right-0 w-64 bg-gradient-to-l from-[#0a1110] via-[#0a1110]/90 to-transparent z-10" />

          <div className="flex gap-24 items-center animate-marquee whitespace-nowrap py-12">
            {displayLogos.map((logo, i) => (
              <div
                key={i}
                className="flex items-center grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-500 cursor-default group"
                title={logo.name}
              >
                {/* SVG Logo Mapping */}
                {logo.name === 'intel' && (
                  <svg className="h-12 w-auto fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M24 14.18c0 4.14-5.37 7.5-12 7.5S0 18.32 0 14.18c0-3.32 3.46-6.17 8.35-7.14L6.96 4.38h3.31l1.16 2.62c.2.01.39.01.57.01 6.63 0 12 3.36 12 7.17zM11.51 9c-3.15 0-5.71 1.76-5.71 3.93 0 2.17 2.56 3.93 5.71 3.93s5.71-1.76 5.71-3.93c0-2.17-2.56-3.93-5.71-3.93zM10.15 14.3h-1.1v-2.12h-.03l-.68 2.12h-.87l-.68-2.12h-.03v2.12H5.68v-3.11h1.36l.66 2.06h.03l.66-2.06h1.36v3.11zm3.84 0h-1.01v-.38h-.03c-.2.29-.53.47-.95.47-.84 0-1.3-.64-1.3-1.46 0-.91.56-1.52 1.4-1.52.36 0 .63.13.82.35h.03v-.9h1.04v3.44zm-1.01-1.39v-.21c0-.44-.22-.72-.57-.72-.34 0-.54.26-.54.72 0 .43.21.72.54.72.33 0 .57-.26.57-.72v.21zm3.43 1.39h-1.04v-3.11h1.04v3.11zm.08-3.77c0 .35-.26.62-.62.62s-.62-.27-.62-.62.26-.62.62-.62.62.27.62.62z"/></svg>
                )}
                {logo.name === 'GitLab' && (
                  <svg className="h-12 w-auto fill-[#E24329]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m23.493 13.14-1.054-3.245a.692.692 0 0 0-.012-.041l-2.016-6.205a.72.72 0 0 0-.173-.306.74.74 0 0 0-.294-.188.75.75 0 0 0-.745.101.76.76 0 0 0-.265.41l-1.637 5.038H8.704L7.067 3.704a.76.76 0 0 0-.265-.41.75.75 0 0 0-.745-.101.74.74 0 0 0-.294.188.72.72 0 0 0-.173.306l-2.016 6.205c0 .014-.007.027-.012.041L.507 13.14a.972.972 0 0 0 .353 1.088l11.14 8.102 11.14-8.102a.972.972 0 0 0 .353-1.088Z"/></svg>
                )}
                {logo.name === 'Square' && (
                  <svg className="h-12 w-auto fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19.123 0H4.877A4.877 4.877 0 0 0 0 4.877v14.246A4.877 4.877 0 0 0 4.877 24h14.246A4.877 4.877 0 0 0 24 19.123V4.877A4.877 4.877 0 0 0 19.123 0zm-.901 16.541a1.68 1.68 0 0 1-1.681 1.681H7.459a1.68 1.68 0 0 1-1.681-1.681V7.459a1.68 1.68 0 0 1 1.681-1.681h9.082a1.68 1.68 0 0 1 1.681 1.681v9.082zM15.42 8.58v6.84H8.58V8.58h6.84z"/></svg>
                )}
                {logo.name === 'Netflix' && (
                  <svg className="h-12 w-auto fill-[#E50914]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4.333 1v22h3l3.667-11.333L14.667 23h3V1h-3v16.667L11 1h-3v16.667L4.333 1z"/></svg>
                )}
                {logo.name === 'Stripe' && (
                  <svg className="h-12 w-auto fill-[#635BFF]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13.962 8.196c0-1.43-1.128-1.905-2.446-1.905-1.1-.033-2.173.254-3.047.814l-.505-1.742c1.23-.746 2.65-1.134 4.093-1.12 3.197 0 5.06 1.626 5.06 4.314 0 4.158-5.71 3.513-5.71 5.34 0 .54.51.815 1.41.815 1.43 0 2.923-.524 3.993-1.25l.556 1.77c-1.345.922-2.946 1.41-4.584 1.405-3.23 0-5.328-1.64-5.328-4.28 0-4.485 5.71-3.69 5.71-5.342V8.196zM1 10.428h2.09l.48 4.606c.045.45.066.9.066 1.35s-.02 1.05-.066 1.5c-.046-.45-.066-1.05-.066-1.5-.045-.45-.105-.9-.153-1.35L2.868 10.428H1v-1.94h4.484v1.94h-2.14l.43 4.108c.044.45.09.9.09 1.35 0 .45-.046 1.05-.09 1.5s-.09-.9-.136-1.35l-.43-4.108H1v1.94z"/></svg>
                )}
                {logo.name === 'Spotify' && (
                  <svg className="h-12 w-auto fill-[#1DB954]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12A12 12 0 0 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.18-.94-.6-.122-.418.18-.84.6-.94 4.561-1.021 8.52-.6 11.64 1.32.42.18.479.659.282 1.121zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                )}
                {logo.name === 'Accenture' && (
                  <svg className="h-12 w-auto fill-[#A100FF]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M16.91 12L5.43 19.34l-1.08-1.74L12.44 12 4.35 6.4l1.08-1.74L16.91 12zM21.36 12l-2.07 1.34L17.22 12l2.07-1.34 2.07 1.34z"/></svg>
                )}
                {logo.name === 'HPE' && (
                  <svg className="h-10 w-auto fill-[#00B388]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M0 6v12h24V6H0zm22 10H2V8h20v8z"/></svg>
                )}
                {/* Fallback for others */}
                {!['intel', 'GitLab', 'Square', 'Netflix', 'Stripe', 'Spotify', 'Accenture', 'HPE'].includes(logo.name) && (
                  <span className="text-4xl font-black text-white/80 uppercase italic tracking-tighter">{logo.name}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
