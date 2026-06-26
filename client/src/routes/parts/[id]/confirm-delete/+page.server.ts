import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth';
import { partTitle } from '$lib/schema-utils';

export const load: PageServerLoad = async (event) => {
  requireUser(event);
  let part;
  try {
    part = await event.locals.pb.collection('parts').getOne(event.params.id);
  } catch {
    throw error(404, 'Part not found');
  }
  const title = partTitle(part as any);
  return { partId: part.id, title };
};

export const actions: Actions = {
  default: async (event) => {
    requireUser(event);
    try {
      await event.locals.pb.collection('parts').delete(event.params.id);
    } catch {
      return fail(400, { error: 'Could not delete this part.' });
    }
    throw redirect(303, '/parts');
  }
};
