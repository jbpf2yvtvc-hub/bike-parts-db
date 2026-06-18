import type { Actions, PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth';
import { getOrCreateProgress, normalizeConfig } from '$lib/server/checklist';
import { getLabel } from '$lib/schema-utils';

interface LinkedPartSummary {
  id: string;
  type_id: string;
  title: string;
  bike?: string;
  bikeName?: string;
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
  const partLinks: Record<string, string> =
    progress.part_links && typeof progress.part_links === 'object' ? progress.part_links : {};

  // Resolve linked parts (for the per-item inventory panel).
  const ids = [...new Set(Object.values(partLinks).filter(Boolean))];
  const linkedParts: Record<string, LinkedPartSummary> = {};
  if (ids.length) {
    const clause = ids.map((id) => `id = '${id}'`).join(' || ');
    const recs = await pb
      .collection('parts')
      .getFullList({ filter: `owner = '${user.id}' && (${clause})`, expand: 'bike' });
    for (const r of recs as any[]) {
      linkedParts[r.id] = {
        id: r.id,
        type_id: r.type_id,
        title:
          [r.attributes?.brand, r.attributes?.model].filter(Boolean).join(' ') ||
          getLabel(r.type_id),
        bike: r.bike || undefined,
        bikeName: r.expand?.bike?.name
      };
    }
  }

  return { bike, config, checkedItems, partLinks, linkedParts };
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
