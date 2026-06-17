import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth';
import { getSchema } from '$lib/schema-utils';

export const load: PageServerLoad = async (event) => {
  requireUser(event);
  let part;
  try {
    part = await event.locals.pb.collection('parts').getOne(event.params.id, { expand: 'bike' });
  } catch {
    throw error(404, 'Part not found');
  }
  return { part, schema: getSchema(part.type_id) ?? null };
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
