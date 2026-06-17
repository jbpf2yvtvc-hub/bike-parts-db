import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth';
import { parseBikeForm } from '$lib/server/bikes';

export const load: PageServerLoad = (event) => {
  requireUser(event);
  return {};
};

export const actions: Actions = {
  default: async (event) => {
    const user = requireUser(event);
    const parsed = parseBikeForm(await event.request.formData());
    if (!parsed.ok) return fail(400, { errors: parsed.errors, values: parsed.values });

    const bike = await event.locals.pb
      .collection('bikes')
      .create({ ...parsed.record, owner: user.id });

    throw redirect(303, `/bikes/${bike.id}`);
  }
};
