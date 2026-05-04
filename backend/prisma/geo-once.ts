// One-off: refresh server geo for all monitors. Run with: npx ts-node --transpile-only prisma/geo-once.ts
import { PrismaClient } from '@prisma/client';
import { promises as dns } from 'dns';

const prisma = new PrismaClient();

async function resolveIp(host: string) {
  try {
    const v4 = await dns.resolve4(host);
    if (v4.length) return v4[0];
  } catch {
    /* */
  }
  try {
    const v6 = await dns.resolve6(host);
    if (v6.length) return v6[0];
  } catch {
    /* */
  }
  return null;
}

async function lookup(url: string) {
  const host = url.includes('://') ? new URL(url).hostname : url;
  const ip = await resolveIp(host);
  if (!ip) return null;
  const fields = 'status,country,countryCode,regionName,city,lat,lon,query';
  const res = await fetch(`http://ip-api.com/json/${ip}?fields=${fields}`);
  if (!res.ok) return null;
  const j = await res.json();
  if (j.status !== 'success') return null;
  return {
    ip: j.query,
    lat: j.lat,
    lng: j.lon,
    country: j.country ?? null,
    countryCode: j.countryCode ?? null,
    region: j.regionName ?? null,
    city: j.city ?? null,
  };
}

async function main() {
  const monitors = await prisma.monitor.findMany();
  for (const m of monitors) {
    const r = await lookup(m.url);
    if (!r) {
      console.warn(`${m.url} → geo lookup failed`);
      continue;
    }
    await prisma.monitor.update({
      where: { id: m.id },
      data: {
        serverIp: r.ip,
        serverLat: r.lat,
        serverLng: r.lng,
        serverCountry: r.country,
        serverCountryCode: r.countryCode,
        serverRegion: r.region,
        serverCity: r.city,
        serverGeoCheckedAt: new Date(),
      },
    });
    console.log(`${m.url} → ${r.city ?? '-'}, ${r.country ?? '-'} (${r.lat}, ${r.lng}) IP ${r.ip}`);
    await new Promise((res) => setTimeout(res, 1500));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
