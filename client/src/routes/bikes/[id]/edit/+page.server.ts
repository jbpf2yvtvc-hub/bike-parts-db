import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth';
import { parseBikeForm } from '$lib/server/bikes';

export const load: PageServerLoad = async (event) => {
  requireUser(event);
  try {
    const bike = await event.locals.pb.collection('bikes').getOne(event.params.id);
    return { bike };
  } catch {
    throw error(404, 'Bike not found');
  }
};

export const actions: Actions = {
  default: async (event) => {
    requireUser(event);
    const parsed = parseBikeForm(await event.request.formData());
    if (!parsed.ok) return fail(400, { errors: parsed.errors, values: parsed.values });

    await event.locals.pb.collection('bikes').update(event.params.id, parsed.record!);
    throw redirect(303, `/bikes/${event.params.id}`);
  }
};
