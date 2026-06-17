import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth';
import { deleteBikeDetachingParts } from '$lib/server/bikes';

export const load: PageServerLoad = async (event) => {
  const user = requireUser(event);
  let bike;
  try {
    bike = await event.locals.pb.collection('bikes').getOne(event.params.id);
  } catch {
    throw error(404, 'Bike not found');
  }
  const partCount = (
    await event.locals.pb
      .collection('parts')
      .getList(1, 1, { filter: `owner = '${user.id}' && bike = '${event.params.id}'` })
  ).totalItems;

  return { bike, partCount };
};

export const actions: Actions = {
  default: async (event) => {
    const user = requireUser(event);
    try {
      await deleteBikeDetachingParts(event.locals.pb, event.params.id, user.id);
    } catch {
      return fail(400, { error: 'Could not delete this bike.' });
    }
    throw redirect(303, '/bikes');
  }
};
