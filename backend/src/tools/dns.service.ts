import { Injectable, Logger } from '@nestjs/common';
import { promises as dns } from 'dns';

export type RecordType =
  | 'A'
  | 'AAAA'
  | 'MX'
  | 'TXT'
  | 'NS'
  | 'CNAME'
  | 'SOA'
  | 'CAA';

export type DnsRecord = {
  type: RecordType;
  value: string;
  priority?: number;
  ttl?: number | null;
};

export type DnsRecordSet = {
  type: RecordType;
  records: DnsRecord[];
  error: string | null;
};

const ALL_TYPES: RecordType[] = [
  'A',
  'AAAA',
  'MX',
  'TXT',
  'NS',
  'CNAME',
  'SOA',
  'CAA',
];

@Injectable()
export class DnsService {
  private readonly logger = new Logger(DnsService.name);

  async lookupAll(host: string): Promise<DnsRecordSet[]> {
    return Promise.all(ALL_TYPES.map((t) => this.lookup(host, t)));
  }

  async lookup(host: string, type: RecordType): Promise<DnsRecordSet> {
    try {
      const records = await this.resolveByType(host, type);
      return { type, records, error: null };
    } catch (err: unknown) {
      const e = err as NodeJS.ErrnoException;
      // ENODATA / ENOTFOUND / ENOSUCHRECORD just mean "no record of this type"
      // — not an error worth surfacing to the user.
      if (
        e.code === 'ENODATA' ||
        e.code === 'ENOTFOUND' ||
        e.code === 'ENOSUCHRECORD'
      ) {
        return { type, records: [], error: null };
      }
      this.logger.warn(`DNS ${type} lookup failed for ${host}: ${e.message}`);
      return { type, records: [], error: e.message || 'Lookup failed' };
    }
  }

  private async resolveByType(
    host: string,
    type: RecordType,
  ): Promise<DnsRecord[]> {
    switch (type) {
      case 'A': {
        const rows = await dns.resolve4(host);
        return rows.map((value) => ({ type, value }));
      }
      case 'AAAA': {
        const rows = await dns.resolve6(host);
        return rows.map((value) => ({ type, value }));
      }
      case 'MX': {
        const rows = await dns.resolveMx(host);
        return rows
          .sort((a, b) => a.priority - b.priority)
          .map((row) => ({
            type,
            value: row.exchange,
            priority: row.priority,
          }));
      }
      case 'TXT': {
        const rows = await dns.resolveTxt(host);
        // TXT records come back as string[][] — join each chunk array into
        // one logical record string.
        return rows.map((parts) => ({ type, value: parts.join('') }));
      }
      case 'NS': {
        const rows = await dns.resolveNs(host);
        return rows.map((value) => ({ type, value }));
      }
      case 'CNAME': {
        const rows = await dns.resolveCname(host);
        return rows.map((value) => ({ type, value }));
      }
      case 'SOA': {
        const row = await dns.resolveSoa(host);
        return [
          {
            type,
            value: `${row.nsname} ${row.hostmaster} serial=${row.serial} refresh=${row.refresh} retry=${row.retry} expire=${row.expire} minttl=${row.minttl}`,
          },
        ];
      }
      case 'CAA': {
        const rows = await dns.resolveCaa(host);
        return rows.map((row) => ({
          type,
          value: `${row.critical} ${formatCaa(row)}`,
        }));
      }
    }
  }
}

type CaaLike = {
  issue?: string;
  issuewild?: string;
  iodef?: string;
  contactemail?: string;
  contactphone?: string;
};

function formatCaa(row: CaaLike): string {
  if (row.issue) return `issue "${row.issue}"`;
  if (row.issuewild) return `issuewild "${row.issuewild}"`;
  if (row.iodef) return `iodef "${row.iodef}"`;
  if (row.contactemail) return `contactemail "${row.contactemail}"`;
  if (row.contactphone) return `contactphone "${row.contactphone}"`;
  return JSON.stringify(row);
}
