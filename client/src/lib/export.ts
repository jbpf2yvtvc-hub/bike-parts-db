/**
 * CSV export (§6.3). Flattens the `attributes` JSON to columns with a built-in
 * RFC-4180 CSV serializer and bundles parts.csv + bikes.csv into a single zip
 * (STORE method, no third-party libraries), server-side.
 */
import type { BikeRecord, PartRecord } from './types';
import { getLabel } from './schema-utils';

function flattenParts(parts: PartRecord[]): Record<string, unknown>[] {
  return parts.map((p) => {
    const row: Record<string, unknown> = {
      id: p.id,
      type_id: p.type_id,
      type_label: getLabel(p.type_id),
      disposition: p.disposition,
      quantity: p.quantity ?? 1,
      bikes: (p.expand?.bikes ?? []).map((b) => b.name).join('; '),
      acquisition_date: p.acquisition_date ?? '',
      acquisition_price: p.acquisition_price ?? '',
      asking_price: p.asking_price ?? '',
      created: p.created ?? '',
      updated: p.updated ?? ''
    };
    // Flatten each attribute to an attr.<id> column.
    for (const [k, v] of Object.entries(p.attributes ?? {})) {
      row[`attr.${k}`] = Array.isArray(v) ? v.join('; ') : (v ?? '');
    }
    return row;
  });
}

function flattenBikes(bikes: BikeRecord[]): Record<string, unknown>[] {
  return bikes.map((b) => ({
    id: b.id,
    name: b.name,
    make: b.make ?? '',
    model: b.model ?? '',
    year: b.year ?? '',
    color: b.color ?? '',
    is_active: b.is_active ? 'yes' : 'no',
    notes: b.notes ?? '',
    created: b.created ?? '',
    updated: b.updated ?? ''
  }));
}

/**
 * Serialize flat row objects to an RFC-4180 CSV string. The header is the union
 * of all keys across every row (parts carry variable attr.* columns), preserving
 * first-seen order; missing cells are emitted empty. Fields containing a comma,
 * double-quote, or newline are wrapped in double-quotes with internal quotes
 * doubled. Rows are joined with CRLF.
 */
function toCsv(rows: Record<string, unknown>[]): string {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const k of Object.keys(row)) {
      if (!seen.has(k)) {
        seen.add(k);
        keys.push(k);
      }
    }
  }

  const escape = (value: unknown): string => {
    const s = value === null || value === undefined ? '' : String(value);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines: string[] = [keys.map(escape).join(',')];
  for (const row of rows) {
    lines.push(keys.map((k) => escape(row[k])).join(','));
  }
  return lines.join('\r\n');
}

// CRC-32 (IEEE 802.3 polynomial) table, built once and reused per file.
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >>> 8) & 0xff]);
}

function u32(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]);
}

function concat(parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of parts) {
    out.set(p, pos);
    pos += p.length;
  }
  return out;
}

/**
 * Minimal ZIP writer using the STORE method (no compression). Emits a local file
 * header + raw bytes for each file, then the central directory, then the
 * end-of-central-directory record. Returns the archive as a Uint8Array.
 */
function buildZip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const encoder = new TextEncoder();
  const FLAGS = 0x0800; // bit 11: file name is UTF-8
  const MOD_TIME = 0;
  const MOD_DATE = 0x21; // 1980-01-01

  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const crc = crc32(file.data);
    const size = file.data.length;

    const local = concat([
      u32(0x04034b50), // local file header signature
      u16(20), // version needed to extract
      u16(FLAGS),
      u16(0), // compression method: store
      u16(MOD_TIME),
      u16(MOD_DATE),
      u32(crc),
      u32(size), // compressed size
      u32(size), // uncompressed size
      u16(nameBytes.length),
      u16(0), // extra field length
      nameBytes,
      file.data
    ]);
    localChunks.push(local);

    centralChunks.push(
      concat([
        u32(0x02014b50), // central directory header signature
        u16(20), // version made by
        u16(20), // version needed to extract
        u16(FLAGS),
        u16(0), // compression method: store
        u16(MOD_TIME),
        u16(MOD_DATE),
        u32(crc),
        u32(size),
        u32(size),
        u16(nameBytes.length),
        u16(0), // extra field length
        u16(0), // file comment length
        u16(0), // disk number start
        u16(0), // internal file attributes
        u32(0), // external file attributes
        u32(offset), // relative offset of local header
        nameBytes
      ])
    );

    offset += local.length;
  }

  const central = concat(centralChunks);
  const eocd = concat([
    u32(0x06054b50), // end of central directory signature
    u16(0), // number of this disk
    u16(0), // disk where central directory starts
    u16(files.length), // central directory records on this disk
    u16(files.length), // total central directory records
    u32(central.length), // size of central directory
    u32(offset), // offset of start of central directory
    u16(0) // comment length
  ]);

  return concat([...localChunks, central, eocd]);
}

/** Build the export zip as a Uint8Array suitable for a streamed response. */
export function buildExportZip(parts: PartRecord[], bikes: BikeRecord[]): Uint8Array {
  const encoder = new TextEncoder();
  return buildZip([
    { name: 'parts.csv', data: encoder.encode(toCsv(flattenParts(parts))) },
    { name: 'bikes.csv', data: encoder.encode(toCsv(flattenBikes(bikes))) }
  ]);
}
