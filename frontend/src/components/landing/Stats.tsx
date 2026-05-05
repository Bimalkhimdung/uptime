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
        {FEATURES.map((feat, i) => (
          <div
            key={feat.title}
            className={`bg-white/[0.02] border border-white/5 rounded-none p-8 md:p-10 text-center hover:bg-white/[0.04] transition-all duration-2000 hover:border-emerald-500/20 hover:shadow-[0_0_40px_rgba(52,211,153,0.1)] group ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
            style={{ transitionDelay: `${i * 100}ms` }}
          >
            <div className="text-3xl md:text-4xl mb-6 md:mb-8 group-hover:scale-110 transition-transform duration-500">
              {feat.icon}
            </div>
            <h3 className="text-2xl font-bold text-white mb-4 italic tracking-tight">{feat.title}</h3>
            <p className="text-slate-500 text-lg font-medium leading-relaxed">
              {feat.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
