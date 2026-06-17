import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth';
import { deleteBikeDetachingParts } from '$lib/server/bikes';
import type { PartRecord } from '$lib/types';

export const load: PageServerLoad = async (event) => {
  const user = requireUser(event);
  let bike;
  try {
    bike = await event.locals.pb.collection('bikes').getOne(event.params.id);
  } catch {
    throw error(404, 'Bike not found');
  }
  const parts = await event.locals.pb
    .collection('parts')
    .getFullList({ filter: `owner = '${user.id}' && bike = '${event.params.id}'`, sort: 'type_id' });

  return { bike, parts: parts as unknown as PartRecord[] };
};

export const actions: Actions = {
  // Delete action shared by the no-JS confirm page and the Melt dialog (§6.4).
  delete: async (event) => {
    const user = requireUser(event);
    try {
      await deleteBikeDetachingParts(event.locals.pb, event.params.id, user.id);
    } catch {
      return fail(400, { error: 'Could not delete this bike.' });
    }
    throw redirect(303, '/bikes');
  }
};
