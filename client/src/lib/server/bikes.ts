/** Shared server helpers for bikes — SERVER ONLY. */
import type PocketBase from 'pocketbase';

/**
 * Delete a bike WITHOUT cascading to its parts (§6.4): first nullify the
 * `bike` relation on every part currently on it, then delete the bike and its
 * checklist progress.
 */
export async function deleteBikeDetachingParts(
  pb: PocketBase,
  bikeId: string,
  ownerId: string
): Promise<number> {
  const parts = await pb
    .collection('parts')
    .getFullList({ filter: `owner = '${ownerId}' && bikes.id ?= '${bikeId}'` });

  for (const part of parts) {
    // Remove just this bike from the part's bikes; the part itself is kept.
    const remaining = ((part.bikes as string[]) ?? []).filter((b) => b !== bikeId);
    await pb.collection('parts').update(part.id, { bikes: remaining });
  }

  // Remove the per-bike checklist progress, if any.
  try {
    const progress = await pb
      .collection('checklist_progress')
      .getFirstListItem(`bike = '${bikeId}'`);
    await pb.collection('checklist_progress').delete(progress.id);
  } catch {
    // none — fine
  }

  await pb.collection('bikes').delete(bikeId);
  return parts.length;
}

export interface ParsedBike {
  ok: boolean;
  values: Record<string, any>;
  errors?: Record<string, string>;
  record?: Record<string, any>;
}

export function parseBikeForm(form: FormData): ParsedBike {
  const values = {
    name: String(form.get('name') ?? '').trim(),
    make: String(form.get('make') ?? '').trim(),
    model: String(form.get('model') ?? '').trim(),
    year: String(form.get('year') ?? '').trim(),
    color: String(form.get('color') ?? '').trim(),
    notes: String(form.get('notes') ?? '').trim(),
    is_active: form.has('is_active')
  };

  if (!values.name) {
    return { ok: false, values, errors: { name: 'A name is required.' } };
  }

  const yearNum = values.year ? Number(values.year) : null;

  return {
    ok: true,
    values,
    record: {
      name: values.name,
      make: values.make,
      model: values.model,
      year: yearNum && Number.isFinite(yearNum) ? yearNum : null,
      color: values.color,
      notes: values.notes,
      is_active: values.is_active
    }
  };
}
