'use client';
import { useEffect, useRef, useState } from 'react';

const FEATURES = [
  { title: 'Website monitoring', icon: '🌐', desc: 'Continuous uptime checks for your websites and APIs.' },
  { title: 'Real-time mail alerts', icon: '📧', desc: 'Instant notifications when your services go down.' },
  { title: 'SEO Expert', icon: '🔍', desc: 'Optimize your search visibility and track rankings.' },
  { title: '3rd party integrations', icon: '🔗', desc: 'Seamlessly connect with Slack, Discord, and more.' },
  { title: 'DNS Record', icon: '🌍', desc: 'Monitor and track DNS changes for your domains.' },
  { title: 'SSL Monitoring', icon: '🔐', desc: 'Get alerted before your SSL certificates expire.' },
];

export function Stats() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-20 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {FEATURES.map((feat, i) => {
          const CardContent = (
            <>
              <div className="relative mb-8 inline-block">
                <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full scale-0 group-hover:scale-150 transition-transform duration-700" />
                <div className="text-4xl md:text-5xl relative z-10 group-hover:scale-110 transition-transform duration-500 filter drop-shadow-md">
                  {feat.icon}
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 tracking-tight group-hover:text-emerald-400 transition-colors duration-500 italic">{feat.title}</h3>
              <p className="text-slate-400 text-lg font-medium leading-relaxed group-hover:text-slate-300 transition-colors duration-500">
                {feat.desc}
              </p>
            </>
          );

          const className = `bg-white/[0.03] border border-white/10 rounded-3xl p-8 md:p-10 text-center hover:bg-white/[0.06] transition-all duration-700 hover:border-emerald-500/30 hover:shadow-[0_20px_50px_-20px_rgba(16,185,129,0.2)] group backdrop-blur-sm ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`;

          return feat.href ? (
            <a
              key={feat.title}
              href={feat.href}
              target="_blank"
              rel="noopener noreferrer"
              className={className}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              {CardContent}
            </a>
          ) : (
            <div
              key={feat.title}
              className={className}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              {CardContent}
            </div>
          );
        })}
      </div>
    </section>
  );
}
