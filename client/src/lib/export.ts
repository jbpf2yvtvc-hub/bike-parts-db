/**
 * CSV export (§6.3). Flattens the `attributes` JSON to columns via papaparse
 * and bundles parts.csv + bikes.csv into a single zip, server-side.
 */
import Papa from 'papaparse';
import JSZip from 'jszip';
import type { BikeRecord, PartRecord } from './types';
import { getLabel } from './schema-utils';

function flattenParts(parts: PartRecord[]): Record<string, unknown>[] {
  return parts.map((p) => {
    const row: Record<string, unknown> = {
      id: p.id,
      type_id: p.type_id,
      type_label: getLabel(p.type_id),
      disposition: p.disposition,
      bike: p.expand?.bike?.name ?? '',
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

/** Build the export zip as a Uint8Array suitable for a streamed response. */
export async function buildExportZip(
  parts: PartRecord[],
  bikes: BikeRecord[]
): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file('parts.csv', Papa.unparse(flattenParts(parts)));
  zip.file('bikes.csv', Papa.unparse(flattenBikes(bikes)));
  return zip.generateAsync({ type: 'uint8array' });
}
