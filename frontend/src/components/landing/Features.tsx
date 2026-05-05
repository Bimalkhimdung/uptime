const REVIEWS = [
  {
    name: "Alex Rivera",
    role: "Senior DevOps Engineer",
    text: "Uptime has completely changed how we handle site reliability. The instant notifications and global checks are top-tier.",
    color: "from-emerald-400 to-cyan-500",
    avatar: "https://i.pinimg.com/474x/25/3a/bf/253abf4f1f4bc16b6dc04571f8d21624.jpg"
  },
  {
    name: "Sarah Chen",
    role: "Fullstack Developer",
    text: "The cleanest UI I've ever used for monitoring. Setting up a new monitor takes seconds, and the SEO tool is a hidden gem.",
    color: "from-violet-400 to-fuchsia-500",
    avatar: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTaHYJ_Ws1-IVS-xH06a2ma_EPTZWoLvz45aw&s"
  },
  {
    name: "Marcus Thorne",
    role: "Product Manager",
    text: "Reliable, fast, and beautiful. Our downtime decreased by 40% in the first month. Highly recommended for any scaling startup.",
    color: "from-amber-400 to-orange-500",
    avatar: ""
  },
  {
    name: "Elena Rodriguez",
    role: "CTO @ TechFlow",
    text: "The enterprise features are robust. We monitor over 500 endpoints and it's never missed a beat. Best investment this year.",
    color: "from-blue-400 to-indigo-500",
    avatar: "ER"
  },
  {
    name: "James Wilson",
    role: "Independent Indie Hacker",
    text: "As a solo dev, I need tools that just work. Uptime gives me peace of mind so I can focus on building my features.",
    color: "from-rose-400 to-red-500",
    avatar: "JW"
  },
  {
    name: "Akihiro Sato",
    role: "Backend Lead",
    text: "The API is fantastic for custom integrations. We've hooked it into our internal Slack bots seamlessly. Great documentation.",
    color: "from-lime-400 to-green-500",
    avatar: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRKSaw-O6mGkx-369PRX0slAXZ1iUDMwFVOPA&s"
  }
];

export function Features() {
  // Double the reviews for seamless loop
  const displayReviews = [...REVIEWS, ...REVIEWS];

  return (
    <section className="py-32 relative overflow-hidden">
      {/* Subtle Globe/Map Background Decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10">
        <div className="text-center mb-20 px-6">
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6 italic tracking-tight leading-tight">
            Trusted by <span className="text-emerald-400">5M+</span> <br className="hidden md:block" />
            users and developers globally.
          </h2>
          <p className="text-slate-400 text-lg font-medium max-w-2xl mx-auto">
            From solo founders to enterprise engineering teams, Uptime provides the reliability needed to scale with confidence.
          </p>
        </div>

        {/* Marquee Container */}
        <div className="relative w-full overflow-hidden py-10">
          {/* Gradient Masks */}
          <div className="absolute inset-y-0 left-0 w-32 md:w-64 bg-gradient-to-r from-[#0a1110] to-transparent z-20 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-32 md:w-64 bg-gradient-to-l from-[#0a1110] to-transparent z-20 pointer-events-none" />

          <div className="flex gap-10 animate-marquee px-6 w-max py-10">
            {displayReviews.map((review, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-[400px] md:w-[550px] group relative bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-12 overflow-hidden hover:bg-white/[0.06] transition-all duration-700 hover:border-emerald-500/30 hover:shadow-[0_30px_70px_-20px_rgba(16,185,129,0.3)] backdrop-blur-md"
              >
                <div
                  className={`absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br ${review.color} blur-[80px] opacity-10 group-hover:opacity-30 transition-opacity duration-700`}
                />

                <div className="relative z-10">
                  <div className="flex items-center gap-5 mb-10">
                    <div className={`w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br ${review.color} flex items-center justify-center text-black font-black text-sm shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                      {review.avatar.startsWith('http') ? (
                        <img src={review.avatar} alt={review.name} className="w-full h-full object-cover" />
                      ) : (
                        review.avatar || review.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-lg tracking-tight group-hover:text-emerald-400 transition-colors duration-500">{review.name}</h4>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{review.role}</p>
                    </div>
                  </div>

                  <div className="mb-10 relative">
                    <span className="absolute -top-4 -left-4 text-emerald-500/20 text-6xl font-serif">"</span>
                    <p className="text-slate-200 text-xl leading-relaxed font-medium italic relative z-10">
                      {review.text}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex gap-1.5">
                      {[...Array(5)].map((_, star) => (
                        <span key={star} className="text-emerald-400 text-lg drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">★</span>
                      ))}
                    </div>
                    <div className="h-px flex-grow mx-4 bg-white/5" />
                    <div className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">Verified Review</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
