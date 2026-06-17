import type { Actions, PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = () => {
  // No GET page; logging out is a POST action.
  throw redirect(303, '/');
};

export const actions: Actions = {
  default: async ({ locals }) => {
    locals.pb.authStore.clear();
    throw redirect(303, '/login');
  }
};
