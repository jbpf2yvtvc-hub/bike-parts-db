import type { Actions } from './$types';
import { fail } from '@sveltejs/kit';

// Password reset via PocketBase's built-in email flow, delivered via Resend
// SMTP (§2.4). We always report success so the form never reveals whether an
// email is registered.
export const actions: Actions = {
  default: async ({ request, locals }) => {
    const form = await request.formData();
    const email = String(form.get('email') ?? '').trim();
    if (!email) return fail(400, { error: 'Enter your email address.' });

    try {
      await locals.pb.collection('users').requestPasswordReset(email);
    } catch {
      // Swallow — do not leak account existence.
    }
    return { sent: true };
  }
};
