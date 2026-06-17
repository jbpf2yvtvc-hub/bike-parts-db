import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';

function safeRedirect(target: string | null): string {
  // Only allow same-origin relative paths (no open redirects).
  if (target && target.startsWith('/') && !target.startsWith('//')) return target;
  return '/';
}

export const actions: Actions = {
  default: async ({ request, locals, url }) => {
    const form = await request.formData();
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');

    if (!email || !password) {
      return fail(400, { error: 'Email and password are required.', email });
    }

    try {
      await locals.pb.collection('users').authWithPassword(email, password);
    } catch {
      return fail(400, { error: 'Invalid email or password.', email });
    }

    throw redirect(303, safeRedirect(url.searchParams.get('redirectTo')));
  }
};
