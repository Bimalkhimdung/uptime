import Link from 'next/link';

export function Footer() {
  const sections = [
    {
      title: 'Monitoring',
      links: [
        'Website & endpoint monitoring',
        'Keyword monitoring',
        'Ping monitoring',
        'Port monitoring',
        'Cron job monitoring',
        'Status pages',
        'Incident management',
        'API monitoring',
      ],
    },
    {
      title: 'Product',
      links: ['Integrations', 'API', 'MCP', 'Roadmap', 'Status', 'Is it down?'],
    },
    {
      title: 'Company',
      links: [
        'Contact us',
        'Affiliate program',
        'Clients',
        'Non profits',
        'Terms / Privacy / DPA',
        'Security & compliance',
      ],
    },
    {
      title: 'Features',
      links: [
        'Multi-location monitoring',
        'Response time monitoring',
        'SSL monitoring',
        'Domain monitoring',
        'DNS monitoring',
        { label: 'StyledText', href: 'https://www.styledtext.com/' },
        { label: 'White screen', href: 'https://www.whitescreenhd.com/' },
      ],
    },
    {
      title: 'Comparison',
      links: [
        'vs. Statuspage',
        'vs. BetterStack',
        'vs. Site24x7',
        'vs. Pingdom',
        'vs. Uptime.com',
      ],
    },
    {
      title: 'Resources',
      links: ['Help center', 'FAQs', 'Locations & IPs', 'Blog', 'Knowledge hub'],
    },
    {
      title: 'Free tools',
      links: [
        'Subnet calculator',
        'MX lookup',
        'Uptime calculator',
        'CrontabRobot',
        'Web change detection',
      ],
    },
  ];

  return (
    <footer className="bg-[#030303] pt-24 pb-12 px-6 border-t border-white/5 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-y-16 gap-x-8">
          {/* Logo Section */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-black text-2xl text-white tracking-tighter italic">Uptime</span>
            </Link>
            <p className="text-slate-400 text-sm font-medium mb-6 leading-relaxed max-w-[200px]">
              Downtime happens. <br /> Get notified!
            </p>
            <div className="flex items-center gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all cursor-pointer">
                  <span className="text-[10px]">●</span>
                </div>
              ))}
            </div>
          </div>

          {/* Nav Sections */}
          {sections.map((section) => (
            <div key={section.title}>
              <h4 className="text-white font-bold text-base mb-6 italic tracking-tight">
                {section.title}<span className="text-emerald-400">.</span>
              </h4>
              <ul className="space-y-4">
                {section.links.map((link) => {
                  const isObject = typeof link === 'object';
                  const label = isObject ? link.label : (link as string);
                  const href = isObject ? link.href : '#';
                  const isExternal = isObject && link.href.startsWith('http');

                  return (
                    <li key={label}>
                      <Link
                        href={href}
                        target={isExternal ? '_blank' : undefined}
                        rel={isExternal ? 'noopener noreferrer' : undefined}
                        className="text-slate-500 hover:text-emerald-400 transition-colors text-sm font-medium"
                      >
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-24 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-slate-600 text-xs font-medium uppercase tracking-widest">
            © {new Date().getFullYear()} Uptime. All rights reserved.
          </p>
          <div className="flex gap-8">
            <Link href="#" className="text-slate-600 hover:text-white text-xs font-medium uppercase tracking-widest transition-colors">Twitter</Link>
            <Link href="#" className="text-slate-600 hover:text-white text-xs font-medium uppercase tracking-widest transition-colors">GitHub</Link>
            <Link href="#" className="text-slate-600 hover:text-white text-xs font-medium uppercase tracking-widest transition-colors">Discord</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
