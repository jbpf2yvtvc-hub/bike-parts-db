import type { Actions, PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth';
import {
  getOrCreateProgress,
  normalizeConfig,
  removePartFromBikeLinks,
  buildChecklistContext
} from '$lib/server/checklist';
import { unitsOnBike, totalUnitsAssigned } from '$lib/server/parts';
import { findItem, getTitle } from '$lib/checklist-data';
import { partTitle } from '$lib/schema-utils';
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
  const title = partTitle(part);
  // Show a few key attributes for the picker.
  const keyAttrs = Object.entries(part.attributes ?? {})
    .filter(([k, v]) => v != null && v !== '' && k !== 'brand' && k !== 'model' && k !== 'notes')
    .slice(0, 4)
    .map(([, v]) => (Array.isArray(v) ? v.join(', ') : String(v)));

  const otherBikes: { id: string; name: string }[] = (part.expand?.bikes ?? [])
    .filter((b: any) => b.id !== bikeId)
    .map((b: any) => ({ id: b.id, name: b.name }));
  const quantity = part.quantity ?? 1;
  const onThisBike = unitsOnBike(part, bikeId) > 0;
  const available = Math.max(0, quantity - totalUnitsAssigned(part)); // units not yet on a bike

  let status: string;
  if (onThisBike) status = 'On this bike ✓';
  else if (otherBikes.length) status = `📍 On: ${otherBikes.map((b) => b.name).join(', ')}`;
  else status = 'In inventory · not on a bike';

  return {
    id: part.id,
    type_id: part.type_id,
    title,
    keyAttrs,
    status,
    quantity,
    available,
    onThisBike,
    otherBikes
  };
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

  // Context (brake mounts from the linked fork/frame, etc.) drives the brake,
  // lever, wheel, fork and frame filters.
  const onBike = (await pb
    .collection('parts')
    .getFullList({ filter: `owner = '${user.id}' && bikes.id ?= '${bike.id}'`, expand: 'bikes' })) as any[];
  const checklistCtx = await buildChecklistContext(pb, partLinks, onBike);

  const typeId = getTypeIdForItem(itemKey);
  const compatFilter = getCompatibilityFilter(itemKey, config, checklistCtx);

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
  // Link a part to this item AND put it on this bike (consuming one unit of its
  // quantity). If every unit is already on other bikes, the part must be
  // *switched* — that requires `confirm=1` (the picker surfaces a dialog / a
  // no-JS confirm page); without it we bounce to the confirm page.
  linkPart: async (event) => {
    const user = requireUser(event);
    const pb = event.locals.pb;
    const bikeId = event.params.id;
    const form = await event.request.formData();
    const itemKey = String(form.get('item') ?? '');
    const partId = String(form.get('partId') ?? '');
    const confirmed = String(form.get('confirm') ?? '') === '1';
    const back = `/bikes/${bikeId}/checklist`;
    if (!itemKey || !partId) throw redirect(303, back);

    let part;
    try {
      part = await pb.collection('parts').getOne(partId);
    } catch {
      throw redirect(303, back);
    }

    const quantity = (part.quantity as number) || 1;

    // Per-bike unit counts (backfill legacy one-unit-per-bike records).
    const bikeQty: Record<string, number> = {};
    const rawQty = part.bike_qty;
    if (rawQty && typeof rawQty === 'object') {
      for (const [b, n] of Object.entries(rawQty as Record<string, unknown>)) {
        const v = Math.floor(Number(n));
        if (b && Number.isFinite(v) && v > 0) bikeQty[b] = v;
      }
    } else if (Array.isArray(part.bikes)) {
      for (const b of part.bikes as string[]) bikeQty[b] = 1;
    }

    const progress = await getOrCreateProgress(pb, bikeId, user.id);
    const links: Record<string, string> =
      progress.part_links && typeof progress.part_links === 'object' ? progress.part_links : {};

    // Each explicit link of this part on THIS bike needs its own unit, so
    // linking a second slot to the same part (e.g. an `either` brake on front
    // then rear) consumes a second unit.
    const slotsHere = new Set(
      Object.entries(links).filter(([, id]) => id === partId).map(([k]) => k)
    );
    slotsHere.add(itemKey);
    const neededHere = slotsHere.size;
    const unitsHere = bikeQty[bikeId] ?? 0;

    if (unitsHere < neededHere) {
      const assigned = Object.values(bikeQty).reduce((a, b) => a + b, 0);
      if (assigned < quantity) {
        // A free unit is available — place one more on this bike.
        bikeQty[bikeId] = unitsHere + 1;
      } else if (confirmed) {
        // Fully assigned elsewhere — switch one unit off a chosen prior bike
        // (`from`), defaulting to the first if none/invalid was supplied.
        const others = Object.keys(bikeQty).filter((b) => b !== bikeId);
        const requested = String(form.get('from') ?? '');
        const prior = others.includes(requested) ? requested : others[0];
        if (prior) {
          bikeQty[prior] = (bikeQty[prior] ?? 1) - 1;
          if (bikeQty[prior] <= 0) {
            delete bikeQty[prior];
            // That bike has no units left — drop its links/checks for this part.
            await removePartFromBikeLinks(pb, prior, partId);
          }
          bikeQty[bikeId] = unitsHere + 1;
        }
      } else {
        // Needs confirmation (no-JS path; the JS dialog posts confirm=1).
        throw redirect(
          303,
          `/bikes/${bikeId}/checklist/link-part/switch?item=${encodeURIComponent(itemKey)}&partId=${partId}`
        );
      }
      await pb
        .collection('parts')
        .update(partId, { bike_qty: bikeQty, bikes: Object.keys(bikeQty) });
    }

    // Record the explicit item link + check it off on this bike.
    links[itemKey] = partId;
    const checkedItems: string[] = Array.isArray(progress.checked_items)
      ? progress.checked_items
      : [];
    const checked = [...new Set([...checkedItems, itemKey])];

    const update: Record<string, unknown> = { part_links: links, checked_items: checked };

    // Linking an actual quill stem means no converter is needed — turn it off.
    if (
      itemKey === 'stem::stem-quill' &&
      String((part as any).attributes?.style ?? '').toLowerCase().includes('quill')
    ) {
      update.config = { ...normalizeConfig(progress.config), stem_converter: false };
    }

    await pb.collection('checklist_progress').update(progress.id, update);

    throw redirect(303, back);
  }
};
