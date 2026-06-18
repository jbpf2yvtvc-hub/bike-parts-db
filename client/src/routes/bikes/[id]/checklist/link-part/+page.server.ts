import type { Actions, PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth';
import { getOrCreateProgress, normalizeConfig } from '$lib/server/checklist';
import { findItem, getTitle } from '$lib/checklist-data';
import { getLabel } from '$lib/schema-utils';
import {
  getCompatibilityFilter,
  getTypeIdForItem,
  hasPostFetch,
  hasIncompatibleGroup,
  classifyPart,
  type PostFetchContext
} from '$lib/checklist-compatibility';
import type { PartRecord } from '$lib/types';

function summarize(part: any, bikeId: string) {
  const title =
    [part.attributes?.brand, part.attributes?.model].filter(Boolean).join(' ') ||
    getLabel(part.type_id);
  // Show a few key attributes for the picker.
  const keyAttrs = Object.entries(part.attributes ?? {})
    .filter(([k, v]) => v != null && v !== '' && k !== 'brand' && k !== 'model' && k !== 'notes')
    .slice(0, 4)
    .map(([, v]) => (Array.isArray(v) ? v.join(', ') : String(v)));

  const bikeIds: string[] = Array.isArray(part.bikes) ? part.bikes : [];
  const otherBikeNames: string[] = (part.expand?.bikes ?? [])
    .filter((b: any) => b.id !== bikeId)
    .map((b: any) => b.name);
  const quantity = part.quantity ?? 1;
  const available = Math.max(0, quantity - bikeIds.length); // units not yet on a bike

  let status: string;
  if (bikeIds.includes(bikeId)) status = 'On this bike ✓';
  else if (otherBikeNames.length) status = `📍 On: ${otherBikeNames.join(', ')}`;
  else status = 'In inventory · not on a bike';

  return { id: part.id, type_id: part.type_id, title, keyAttrs, status, quantity, available };
}

export const load: PageServerLoad = async (event) => {
  const user = requireUser(event);
  const pb = event.locals.pb;

  let bike;
  try {
    bike = await pb.collection('bikes').getOne(event.params.id);
  } catch {
    throw error(404, 'Bike not found');
  }

  const itemKey = event.url.searchParams.get('item') ?? '';
  const showAll = event.url.searchParams.get('all') === '1';
  const found = findItem(itemKey);
  if (!found) throw error(400, 'Unknown checklist item');

  const progress = await getOrCreateProgress(pb, bike.id, user.id);
  const config = normalizeConfig(progress.config);
  const partLinks: Record<string, string> =
    progress.part_links && typeof progress.part_links === 'object' ? progress.part_links : {};

  const typeId = getTypeIdForItem(itemKey);
  const compatFilter = getCompatibilityFilter(itemKey, config);

  // "Show all parts anyway" drops the compatibility filter for this session,
  // falling back to the item's type only (§9.5).
  const attrFilter = showAll ? (typeId ? `type_id = '${typeId}'` : '') : compatFilter;
  const filter = attrFilter ? `owner = '${user.id}' && (${attrFilter})` : `owner = '${user.id}'`;

  const raw = (await pb
    .collection('parts')
    .getFullList({ filter, sort: '-created', expand: 'bikes' })) as any[];

  // Two-step (post-fetch) freehub filtering (§9.5).
  let compatible = raw;
  const incompatible: any[] = [];
  if (!showAll && hasPostFetch(itemKey, config)) {
    const ctx: PostFetchContext = {};
    const rearWheelId = partLinks['wheels::rear-wheel'];
    if (itemKey === 'drivetrain::cassette' && rearWheelId) {
      try {
        const rw = await pb.collection('parts').getOne(rearWheelId);
        ctx.linkedRearWheelFreehub = (rw as any).attributes?.freehub_standard;
      } catch {
        /* ignore */
      }
    }
    compatible = [];
    for (const part of raw) {
      const cls = classifyPart(itemKey, config, part as unknown as PartRecord, ctx);
      if (cls === 'compatible') compatible.push(part);
      else if (hasIncompatibleGroup(itemKey)) incompatible.push(part);
      // cassette: incompatible parts are simply dropped.
    }
  }

  return {
    bike,
    itemKey,
    itemTitle: getTitle(found.item, config),
    typeId,
    showAll,
    linkedPartId: partLinks[itemKey] ?? null,
    compatible: compatible.map((p) => summarize(p, bike.id)),
    incompatible: incompatible.map((p) => summarize(p, bike.id))
  };
};

export const actions: Actions = {
  linkPart: async (event) => {
    const user = requireUser(event);
    const pb = event.locals.pb;
    const form = await event.request.formData();
    const itemKey = String(form.get('item') ?? '');
    const partId = String(form.get('partId') ?? '');
    if (!itemKey || !partId) throw redirect(303, `/bikes/${event.params.id}/checklist`);

    const progress = await getOrCreateProgress(pb, event.params.id, user.id);
    const links: Record<string, string> =
      progress.part_links && typeof progress.part_links === 'object' ? progress.part_links : {};
    links[itemKey] = partId;

    // Linking a part auto-checks its checklist item (the checkbox then renders
    // checked + disabled until the part is unlinked).
    const checkedItems: string[] = Array.isArray(progress.checked_items)
      ? progress.checked_items
      : [];
    const checked = [...new Set([...checkedItems, itemKey])];

    await pb
      .collection('checklist_progress')
      .update(progress.id, { part_links: links, checked_items: checked });

    throw redirect(303, `/bikes/${event.params.id}/checklist`);
  }
};
