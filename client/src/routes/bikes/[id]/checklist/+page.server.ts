import type { Actions, PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth';
import {
  getOrCreateProgress,
  normalizeConfig,
  buildChecklistContext,
  removePartFromBikeLinks
} from '$lib/server/checklist';
import { getLabel } from '$lib/schema-utils';
import { matchItemsForPart } from '$lib/checklist-compatibility';
import type { PartRecord } from '$lib/types';

// One resolved link for an item, with where it came from:
//  - 'bike'   : derived automatically because the part is installed on this bike
//  - 'manual' : linked by the user via the part picker
interface LinkEntry {
  id: string;
  type_id: string;
  title: string;
  quantity: number;
  onThisBike: boolean;
  otherBikeNames: string[];
  source: 'bike' | 'manual';
}

function summarizeLink(p: any, thisBikeId: string, source: 'bike' | 'manual'): LinkEntry {
  const bikeIds: string[] = Array.isArray(p.bikes) ? p.bikes : [];
  const expanded: any[] = p.expand?.bikes ?? [];
  return {
    id: p.id,
    type_id: p.type_id,
    title:
      [p.attributes?.brand, p.attributes?.model].filter(Boolean).join(' ') || getLabel(p.type_id),
    quantity: p.quantity ?? 1,
    onThisBike: bikeIds.includes(thisBikeId),
    otherBikeNames: expanded.filter((b) => b.id !== thisBikeId).map((b) => b.name),
    source
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

  const progress = await getOrCreateProgress(pb, bike.id, user.id);
  const config = normalizeConfig(progress.config);
  const checkedItems: string[] = Array.isArray(progress.checked_items) ? progress.checked_items : [];
  const explicitLinks: Record<string, string> =
    progress.part_links && typeof progress.part_links === 'object' ? progress.part_links : {};

  // --- Links: explicit overrides + parts installed on this bike --------------
  // Parts on this bike auto-fill their matching slot(s) — a part can fill more
  // than one (a brifter is a shifter AND a brake lever). An explicit part_link
  // for a slot WINS over the auto-fill, which is how you override (e.g. put a
  // separate shifter in the shifter slot while a brifter stays in the lever).
  const onBike = (await pb
    .collection('parts')
    .getFullList({ filter: `owner = '${user.id}' && bikes.id ?= '${bike.id}'`, expand: 'bikes' })) as any[];

  const byId: Record<string, any> = {};
  for (const p of onBike) byId[p.id] = p;

  // Context derived from the linked frame/fork/calipers (brake mounts, clamp).
  const ctx = await buildChecklistContext(pb, explicitLinks, onBike);

  // Implied (on-bike) fills, multi-slot, skipping any slot with an explicit link.
  const impliedByKey: Record<string, string> = {};
  for (const p of onBike) {
    for (const key of matchItemsForPart(p as PartRecord, config, ctx)) {
      if (key in explicitLinks) continue; // explicit override wins
      if (key in impliedByKey) continue; // first on-bike part claims the slot
      impliedByKey[key] = p.id;
    }
  }

  // Resolve explicitly-linked parts not already loaded (may not be on the bike).
  const explicitIds = [...new Set(Object.values(explicitLinks).filter((id) => id && !byId[id]))];
  if (explicitIds.length) {
    const clause = explicitIds.map((id) => `id = '${id}'`).join(' || ');
    const recs = (await pb
      .collection('parts')
      .getFullList({ filter: `owner = '${user.id}' && (${clause})`, expand: 'bikes' })) as any[];
    for (const r of recs) byId[r.id] = r;
  }

  // Build the effective per-item link map: explicit first, then implied fills
  // the remaining slots.
  const links: Record<string, LinkEntry> = {};
  for (const [key, id] of Object.entries(explicitLinks)) {
    if (byId[id]) links[key] = summarizeLink(byId[id], bike.id, 'manual');
  }
  for (const [key, id] of Object.entries(impliedByKey)) {
    if (!(key in links) && byId[id]) links[key] = summarizeLink(byId[id], bike.id, 'bike');
  }

  // View filter for no-JS (?view=installed|needed); default 'all'.
  const rawView = event.url.searchParams.get('view');
  const view = rawView === 'installed' || rawView === 'needed' ? rawView : 'all';

  return { bike, config, checkedItems, links, view, ctx };
};

export const actions: Actions = {
  // No-JS baseline: the whole checklist is one form; Save persists all checks.
  // JS enhancement debounce-submits the same form on each change.
  saveChecks: async (event) => {
    const user = requireUser(event);
    const pb = event.locals.pb;
    const form = await event.request.formData();
    const submitted = form.getAll('checked').map(String);

    const progress = await getOrCreateProgress(pb, event.params.id, user.id);
    const links: Record<string, string> =
      progress.part_links && typeof progress.part_links === 'object' ? progress.part_links : {};

    // Items with a linked part are auto-checked and their checkboxes are
    // disabled, so a disabled checkbox never submits its value. Union the
    // linked item keys back in so their checked state is always preserved.
    const checked = [...new Set([...submitted, ...Object.keys(links)])];

    await pb.collection('checklist_progress').update(progress.id, { checked_items: checked });

    if (form.get('__noscript') === '1') throw redirect(303, `/bikes/${event.params.id}/checklist`);
    return { saved: true };
  },

  // Remove a part from this bike entirely (and from every slot it filled here):
  // drop the bike from the part's `bikes`, and clear any explicit links + checks
  // pointing at it on this bike.
  removeFromBike: async (event) => {
    requireUser(event);
    const pb = event.locals.pb;
    const bikeId = event.params.id;
    const form = await event.request.formData();
    const partId = String(form.get('partId') ?? '');

    if (partId) {
      try {
        const part = await pb.collection('parts').getOne(partId);
        const bikes = (Array.isArray(part.bikes) ? (part.bikes as string[]) : []).filter(
          (b) => b !== bikeId
        );
        await pb.collection('parts').update(partId, { bikes });
      } catch {
        /* part missing — ignore */
      }
      await removePartFromBikeLinks(pb, bikeId, partId);
    }

    throw redirect(303, `/bikes/${bikeId}/checklist`);
  }
};
