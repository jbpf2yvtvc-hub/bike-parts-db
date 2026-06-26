/** Shared server helpers for the part intake/edit forms — SERVER ONLY. */
import type PocketBase from 'pocketbase';
import {
  schemaToZod,
  buildTags,
  readAttributes,
  partTitle,
  type PartSchema
} from '$lib/schema-utils';

// Re-exported so existing `$lib/server/parts` importers keep working; the
// canonical definition lives in the non-server module so .svelte components
// (which can't import from $lib/server) can share it too.
export { partTitle };
import {
  rolesForType,
  normalizeAssociations,
  type AssociationRole
} from '$lib/associations';

export interface PartMeta {
  disposition: string;
  quantity: number;
  /** Distinct bikes this part is installed on (derived from bike_qty). */
  bikes: string[];
  /** Units of this part installed per bike: { [bikeId]: count }. A part with
   *  quantity N can place up to N units total, and more than one on a single
   *  bike (e.g. two `either` brakes, front + rear). */
  bike_qty: Record<string, number>;
  /** Part-to-part associations by role: { [role]: partId[] }. */
  associations: Record<string, string[]>;
  acquisition_date: string;
  acquisition_price: number | null;
  asking_price: number | null;
}

export interface AssociationOption extends AssociationRole {
  candidates: { id: string; title: string }[];
  selected: string[];
}

/** Load the pickable candidates + current selection for each association role
 *  of a part type (empty for types without roles). */
export async function loadAssociationOptions(
  pb: PocketBase,
  ownerId: string,
  typeId: string,
  current: unknown
): Promise<AssociationOption[]> {
  const roles = rolesForType(typeId);
  if (!roles.length) return [];
  const selectedByRole = normalizeAssociations(current, typeId);
  const out: AssociationOption[] = [];
  for (const r of roles) {
    const parts = await pb
      .collection('parts')
      .getFullList({ filter: `owner = '${ownerId}' && type_id = '${r.targetType}'`, sort: '-created' });
    out.push({
      ...r,
      candidates: parts.map((p) => ({ id: p.id, title: partTitle(p as any) })),
      selected: selectedByRole[r.role] ?? []
    });
  }
  return out;
}

/** Units of a part installed on a given bike (bike_qty, falling back to the
 *  legacy one-unit-per-bike `bikes` relation for un-migrated records). */
export function unitsOnBike(
  part: { bike_qty?: unknown; bikes?: unknown },
  bikeId: string
): number {
  const q = part?.bike_qty;
  if (q && typeof q === 'object') {
    const n = Number((q as Record<string, unknown>)[bikeId]);
    if (Number.isFinite(n)) return Math.max(0, Math.floor(n));
  }
  const bikeIds = Array.isArray(part?.bikes) ? (part.bikes as string[]) : [];
  return bikeIds.includes(bikeId) ? 1 : 0;
}

/** Total units of a part assigned across all bikes. */
export function totalUnitsAssigned(part: { bike_qty?: unknown; bikes?: unknown }): number {
  const q = part?.bike_qty;
  if (q && typeof q === 'object') {
    return Object.values(q as Record<string, unknown>).reduce<number>((sum, v) => {
      const n = Number(v);
      return sum + (Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0);
    }, 0);
  }
  return Array.isArray(part?.bikes) ? (part.bikes as string[]).length : 0;
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

  // Per-bike unit counts come in as `bike_qty.<bikeId>` numeric inputs. Fall
  // back to legacy `bikes` checkboxes (one unit each) for no-JS / old forms.
  const bikeQty: Record<string, number> = {};
  for (const [k, v] of form.entries()) {
    if (!k.startsWith('bike_qty.')) continue;
    const bikeId = k.slice('bike_qty.'.length);
    const n = Math.floor(Number(v));
    if (bikeId && Number.isFinite(n) && n > 0) bikeQty[bikeId] = n;
  }
  if (Object.keys(bikeQty).length === 0) {
    for (const id of form.getAll('bikes').map(String).filter(Boolean)) {
      bikeQty[id] = (bikeQty[id] ?? 0) + 1;
    }
  }
  const bikes = Object.keys(bikeQty);
  const assigned = Object.values(bikeQty).reduce((a, b) => a + b, 0);

  // Part-to-part associations: `assoc.<role>` selects (single or multi).
  const associations: Record<string, string[]> = {};
  for (const r of rolesForType(schema.type_id)) {
    const ids = [...new Set(form.getAll(`assoc.${r.role}`).map(String).filter(Boolean))];
    associations[r.role] = r.multiple ? ids : ids.slice(0, 1);
  }

  const meta: PartMeta = {
    disposition: String(form.get('disposition') ?? 'unknown'),
    quantity,
    bikes,
    bike_qty: bikeQty,
    associations,
    acquisition_date: String(form.get('acquisition_date') ?? ''),
    acquisition_price: num(form, 'acquisition_price'),
    asking_price: num(form, 'asking_price')
  };

  const errors: Record<string, string> = {};

  // Total units placed on bikes can't exceed how many you own.
  if (assigned > quantity) {
    errors.bikes = `You have ${quantity} of this part but assigned ${assigned} unit${assigned === 1 ? '' : 's'} to bikes. Increase the quantity or remove an assignment.`;
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
    bike_qty: parsed.meta.bike_qty,
    associations: parsed.meta.associations,
    acquisition_date: parsed.meta.acquisition_date || '',
    acquisition_price: parsed.meta.acquisition_price,
    asking_price: parsed.meta.asking_price
  };
}
