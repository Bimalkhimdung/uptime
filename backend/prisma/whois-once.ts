// One-off: refresh WHOIS for all monitors. Run with: npx ts-node --transpile-only prisma/whois-once.ts
import { PrismaClient } from '@prisma/client';
import * as whois from 'whois';
import { getDomain } from 'tldts';

const prisma = new PrismaClient();

const EXPIRY_PATTERNS = [
  /Registry Expiry Date:\s*(.+)/i,
  /Expiry Date:\s*(.+)/i,
  /Expiration Date:\s*(.+)/i,
  /Registrar Registration Expiration Date:\s*(.+)/i,
  /paid-till:\s*(.+)/i,
  /expires:\s*(.+)/i,
  /expire:\s*(.+)/i,
  /renewal date:\s*(.+)/i,
  /Domain Expiration Date:\s*(.+)/i,
];
const REGISTRAR_PATTERNS = [
  /Registrar:\s*(.+)/i,
  /Sponsoring Registrar:\s*(.+)/i,
  /registrar name:\s*(.+)/i,
];

function extractDate(text: string, patterns: RegExp[]): Date | null {
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) {
      const parsed = new Date(m[1].trim());
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }
  return null;
}

function extractString(text: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) {
      const value = m[1].trim().split(/\r?\n/)[0].trim();
      if (value) return value;
    }
  }
  return null;
}

async function lookup(url: string) {
  const host = url.includes('://') ? new URL(url).hostname : url;
  const domain = getDomain(host) ?? host;
  const raw = await new Promise<string>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), 10000);
    (whois as any).lookup(domain, { follow: 2 }, (err: Error | null, data: string) => {
      clearTimeout(t);
      if (err) reject(err);
      else resolve(data);
    });
  });
  return {
    expiresAt: extractDate(raw, EXPIRY_PATTERNS),
    registrar: extractString(raw, REGISTRAR_PATTERNS),
  };
}

async function main() {
  const monitors = await prisma.monitor.findMany();
  for (const m of monitors) {
    try {
      const r = await lookup(m.url);
      const daysLeft = r.expiresAt ? Math.floor((r.expiresAt.getTime() - Date.now()) / 86400_000) : null;
      await prisma.monitor.update({
        where: { id: m.id },
        data: {
          domainExpiresAt: r.expiresAt,
          domainRegistrar: r.registrar,
          domainDaysLeft: daysLeft,
          domainLastCheckedAt: new Date(),
        },
      });
      console.log(`${m.url} → expires ${r.expiresAt?.toISOString() ?? '?'} (${daysLeft} days), registrar: ${r.registrar ?? '?'}`);
    } catch (e: any) {
      console.warn(`${m.url} → WHOIS failed: ${e.message}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
