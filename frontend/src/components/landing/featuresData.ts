export type Feature = {
  icon: string;
  title: string;
  desc: string;
  color: string;
};

export const FEATURES: Feature[] = [
  {
    icon: '⚡',
    title: 'Instant Alerts',
    desc: 'Get notified via Email, Slack, or Discord the moment your service goes down. No delays.',
    color: 'from-violet-500/20',
  },
  {
    icon: '📈',
    title: 'Status Pages',
    desc: 'Build trust with your users using beautiful, public status pages for your services.',
    color: 'from-blue-500/20',
  },
  {
    icon: '🌍',
    title: 'Global Checks',
    desc: 'Monitor from multiple locations worldwide to ensure your site is reachable everywhere.',
    color: 'from-indigo-500/20',
  },
  {
    icon: '🔒',
    title: 'SSL Monitoring',
    desc: "Don't let your certificates expire. We'll warn you well before they do.",
    color: 'from-emerald-500/20',
  },
  {
    icon: '🔍',
    title: 'Keyword Checks',
    desc: 'Verify that specific text exists on your page to ensure your database is loading.',
    color: 'from-orange-500/20',
  },
  {
    icon: '⚙️',
    title: 'API Monitoring',
    desc: 'Deep-dive into your JSON responses and headers for complex API health checks.',
    color: 'from-pink-500/20',
  },
];
