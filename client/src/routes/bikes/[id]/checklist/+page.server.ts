import type { Actions, PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth';
import {
  getOrCreateProgress,
  normalizeConfig,
  buildChecklistContext,
  removePartFromBikeLinks
} from '$lib/server/checklist';
import { partTitle } from '$lib/schema-utils';
import { matchItemsForPart, exclusiveGroupOf } from '$lib/checklist-compatibility';
import { unitsOnBike } from '$lib/server/parts';
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
    title: partTitle(p),
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

  // Implied (on-bike) fills. A part fills the slots it matches, but within an
  // exclusive group (front/rear caliper, left/right lever, front/rear tire) a
  // single unit fills only one slot — so we auto-fill a group only when it's
  // unambiguous (matched slots <= units on this bike) and the user hasn't begun
  // linking that group by hand. Ambiguous groups wait for an explicit link.
  const impliedByKey: Record<string, string> = {};
  for (const p of onBike) {
    const matched = matchItemsForPart(p as PartRecord, config, ctx);
    const units = unitsOnBike(p, bike.id);
    const handledGroups = new Set<readonly string[]>();
    for (const key of matched) {
      const group = exclusiveGroupOf(key);
      if (!group) {
        // Free slot (shifter, derailleur, single-position wheel, …): claim it.
        if (key in explicitLinks || key in impliedByKey) continue;
        impliedByKey[key] = p.id;
        continue;
      }
      if (handledGroups.has(group)) continue;
      handledGroups.add(group);
      // User is managing this group by hand for this part — leave it alone.
      if (group.some((k) => explicitLinks[k] === p.id)) continue;
      const candidates = matched.filter(
        (k) => group.includes(k) && !(k in explicitLinks) && !(k in impliedByKey)
      );
      if (candidates.length === 0 || candidates.length > units) continue; // ambiguous
      for (const k of candidates) impliedByKey[k] = p.id;
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

  const notes = typeof progress.notes === 'string' ? progress.notes : '';

  return { bike, config, checkedItems, links, view, ctx, notes };
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

  // Persist the free-text build notes. No-JS: a form POST that redirects back.
  // JS enhancement debounce-submits this same action as the textarea changes.
  saveNotes: async (event) => {
    const user = requireUser(event);
    const pb = event.locals.pb;
    const form = await event.request.formData();
    const notes = String(form.get('notes') ?? '').slice(0, 10000);

    const progress = await getOrCreateProgress(pb, event.params.id, user.id);
    await pb.collection('checklist_progress').update(progress.id, { notes });

    if (form.get('__noscript') === '1') throw redirect(303, `/bikes/${event.params.id}/checklist#notes`);
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
        // Drop every unit of this part from this bike (Remove = off the bike).
        const bikeQty: Record<string, number> = {};
        const rawQty = part.bike_qty;
        if (rawQty && typeof rawQty === 'object') {
          for (const [b, n] of Object.entries(rawQty as Record<string, unknown>)) {
            const v = Math.floor(Number(n));
            if (b && b !== bikeId && Number.isFinite(v) && v > 0) bikeQty[b] = v;
          }
        } else {
          for (const b of bikes) bikeQty[b] = 1;
        }
        await pb.collection('parts').update(partId, { bikes, bike_qty: bikeQty });
      } catch {
        /* part missing — ignore */
      }
      await removePartFromBikeLinks(pb, bikeId, partId);
    }

    throw redirect(303, `/bikes/${bikeId}/checklist`);
  }
};
