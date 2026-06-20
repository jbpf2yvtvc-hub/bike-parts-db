import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth';
import { getSchema } from '$lib/schema-utils';
import { rolesForType, normalizeAssociations } from '$lib/associations';
import { partTitle } from '$lib/server/parts';

export const load: PageServerLoad = async (event) => {
  const user = requireUser(event);
  let part;
  try {
    part = await event.locals.pb.collection('parts').getOne(event.params.id, { expand: 'bikes' });
  } catch {
    throw error(404, 'Part not found');
  }

  // Resolve associated parts (e.g. a crankset's spider + chainrings) for display.
  const roles = rolesForType(part.type_id);
  const selected = normalizeAssociations(part.associations, part.type_id);
  const ids = [...new Set(roles.flatMap((r) => selected[r.role] ?? []))];
  const titleById: Record<string, string> = {};
  if (ids.length) {
    const clause = ids.map((id) => `id = '${id}'`).join(' || ');
    const recs = await event.locals.pb
      .collection('parts')
      .getFullList({ filter: `owner = '${user.id}' && (${clause})` });
    for (const r of recs) titleById[r.id] = partTitle(r as any);
  }
  const associations = roles
    .map((r) => ({
      label: r.label,
      parts: (selected[r.role] ?? [])
        .filter((id) => titleById[id])
        .map((id) => ({ id, title: titleById[id] }))
    }))
    .filter((a) => a.parts.length);

  return { part, schema: getSchema(part.type_id) ?? null, associations };
};

export const actions: Actions = {
  // Same delete action used by the no-JS confirm page and the Melt dialog (§6).
  delete: async (event) => {
    requireUser(event);
    try {
      await event.locals.pb.collection('parts').delete(event.params.id);
    } catch {
      return fail(400, { error: 'Could not delete this part.' });
    }
    throw redirect(303, '/parts');
  }
};
