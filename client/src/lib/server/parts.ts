/** Shared server helpers for the part intake/edit forms — SERVER ONLY. */
import type PocketBase from 'pocketbase';
import {
  schemaToZod,
  buildTags,
  readAttributes,
  type PartSchema
} from '$lib/schema-utils';

export interface PartMeta {
  disposition: string;
  quantity: number;
  bikes: string[];
  acquisition_date: string;
  acquisition_price: number | null;
  asking_price: number | null;
}

export interface ParsedPart {
  ok: boolean;
  attributes?: Record<string, unknown>;
  tags?: string;
  meta: PartMeta;
  errors?: Record<string, string>;
  rawAttributes: Record<string, unknown>;
}

/** Bike <select> options for the part form. */
export async function loadBikeOptions(pb: PocketBase, ownerId: string) {
  const bikes = await pb
    .collection('bikes')
    .getFullList({ filter: `owner = '${ownerId}'`, sort: 'name' });
  return bikes.map((b) => ({ id: b.id, name: b.name as string }));
}

function num(form: FormData, key: string): number | null {
  const v = form.get(key);
  if (v == null || String(v).trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Validate + normalise a submitted part form against its schema. */
export function parsePartForm(schema: PartSchema, form: FormData): ParsedPart {
  const rawAttributes = readAttributes(schema, form);
  const rawQty = Number(form.get('quantity'));
  const quantity = Number.isFinite(rawQty) && rawQty >= 1 ? Math.floor(rawQty) : 1;
  const bikes = form.getAll('bikes').map(String).filter(Boolean);

  const meta: PartMeta = {
    disposition: String(form.get('disposition') ?? 'unknown'),
    quantity,
    bikes,
    acquisition_date: String(form.get('acquisition_date') ?? ''),
    acquisition_price: num(form, 'acquisition_price'),
    asking_price: num(form, 'asking_price')
  };

  const errors: Record<string, string> = {};

  // A part can be installed on at most `quantity` bikes (one unit each).
  if (bikes.length > quantity) {
    errors.bikes = `You have ${quantity} of this part but selected ${bikes.length} bikes. Increase the quantity or deselect a bike.`;
  }

  const result = schemaToZod(schema).safeParse(rawAttributes);
  let attributes: Record<string, unknown> | undefined;
  if (result.success) {
    attributes = result.data as Record<string, unknown>;
  } else {
    const fieldErrors = result.error.flatten().fieldErrors as Record<string, string[]>;
    for (const k in fieldErrors) errors[k] = fieldErrors[k]?.[0] ?? 'Invalid value';
  }

  if (Object.keys(errors).length > 0 || !attributes) {
    return { ok: false, errors, meta, rawAttributes };
  }

  return { ok: true, attributes, tags: buildTags(schema, attributes), meta, rawAttributes };
}

/** Build the PocketBase record payload from a parsed part. */
export function toRecord(typeId: string, ownerId: string, parsed: ParsedPart) {
  return {
    owner: ownerId,
    type_id: typeId,
    attributes: parsed.attributes ?? {},
    tags: parsed.tags ?? '',
    disposition: parsed.meta.disposition,
    quantity: parsed.meta.quantity,
    bikes: parsed.meta.bikes,
    acquisition_date: parsed.meta.acquisition_date || '',
    acquisition_price: parsed.meta.acquisition_price,
    asking_price: parsed.meta.asking_price
  };
}
