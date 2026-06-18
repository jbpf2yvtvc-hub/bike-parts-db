import type { Actions, PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth';
import { getOrCreateProgress, normalizeConfig } from '$lib/server/checklist';
import { getLabel } from '$lib/schema-utils';
import { matchItemForPart } from '$lib/checklist-compatibility';
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

  // --- Auto-link parts installed on this bike --------------------------------
  // Any part whose `bike` is this bike is matched to its checklist item and
  // shown as linked automatically (no persistence — it always reflects the
  // current part records). These implied links take precedence over manual
  // links for the same item, since the part is physically on the bike.
  const onBike = (await pb
    .collection('parts')
    .getFullList({ filter: `owner = '${user.id}' && bikes.id ?= '${bike.id}'`, expand: 'bikes' })) as any[];

  const byId: Record<string, any> = {};
  for (const p of onBike) byId[p.id] = p;

  // The frame for this build (on-bike, else manually linked) decides whether
  // the seatpost section shows a "collar" or a "binder bolt" item (§9.5).
  let framePart = onBike.find((p) => p.type_id === 'frame');
  if (!framePart && explicitLinks['frame::frame']) {
    try {
      framePart = (await pb.collection('parts').getOne(explicitLinks['frame::frame'])) as any;
      if (framePart) byId[framePart.id] = framePart;
    } catch {
      /* linked frame missing — ignore */
    }
  }
  const ctx = { frameIntegratedClamp: !!framePart?.attributes?.integrated_seatpost_clamp };

  const impliedByKey: Record<string, string> = {};
  for (const p of onBike) {
    const key = matchItemForPart(p as PartRecord, config, ctx);
    if (key) impliedByKey[key] = p.id; // last match wins (rare collisions)
  }

  // Resolve any manually-linked parts not already loaded (they may not be on
  // the bike). Skip manual links overridden by an implied (on-bike) link.
  const manualIds = Object.entries(explicitLinks)
    .filter(([key, id]) => id && !(key in impliedByKey) && !byId[id])
    .map(([, id]) => id);
  if (manualIds.length) {
    const clause = [...new Set(manualIds)].map((id) => `id = '${id}'`).join(' || ');
    const recs = (await pb
      .collection('parts')
      .getFullList({ filter: `owner = '${user.id}' && (${clause})`, expand: 'bikes' })) as any[];
    for (const r of recs) byId[r.id] = r;
  }

  // Build the effective per-item link map (implied wins).
  const links: Record<string, LinkEntry> = {};
  for (const [key, id] of Object.entries(explicitLinks)) {
    if (key in impliedByKey || !byId[id]) continue;
    links[key] = summarizeLink(byId[id], bike.id, 'manual');
  }
  for (const [key, id] of Object.entries(impliedByKey)) {
    if (byId[id]) links[key] = summarizeLink(byId[id], bike.id, 'bike');
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

  unlinkPart: async (event) => {
    const user = requireUser(event);
    const pb = event.locals.pb;
    const form = await event.request.formData();
    const key = String(form.get('key') ?? '');

    const progress = await getOrCreateProgress(pb, event.params.id, user.id);
    const links: Record<string, string> =
      progress.part_links && typeof progress.part_links === 'object' ? progress.part_links : {};
    delete links[key];

    // Unlinking clears the auto-check and re-enables the checkbox.
    const checkedItems: string[] = Array.isArray(progress.checked_items)
      ? progress.checked_items
      : [];
    const checked = checkedItems.filter((k) => k !== key);

    await pb
      .collection('checklist_progress')
      .update(progress.id, { part_links: links, checked_items: checked });

    throw redirect(303, `/bikes/${event.params.id}/checklist`);
  }
};
