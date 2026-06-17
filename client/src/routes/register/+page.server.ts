import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';

const schema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters.')
      .max(30)
      .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers, and underscores.'),
    display_name: z.string().max(60).optional(),
    email: z.string().email('Enter a valid email address.'),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    passwordConfirm: z.string()
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: 'Passwords do not match.',
    path: ['passwordConfirm']
  });

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const form = await request.formData();
    const raw = {
      username: String(form.get('username') ?? '').trim(),
      display_name: String(form.get('display_name') ?? '').trim(),
      email: String(form.get('email') ?? '').trim(),
      password: String(form.get('password') ?? ''),
      passwordConfirm: String(form.get('passwordConfirm') ?? '')
    };

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      return fail(400, { errors: fieldErrors, values: { ...raw, password: '', passwordConfirm: '' } });
    }

    try {
      await locals.pb.collection('users').create({
        username: parsed.data.username,
        display_name: parsed.data.display_name || parsed.data.username,
        email: parsed.data.email,
        emailVisibility: false,
        password: parsed.data.password,
        passwordConfirm: parsed.data.passwordConfirm
      });
      // Log the new user in immediately.
      await locals.pb.collection('users').authWithPassword(parsed.data.email, parsed.data.password);
      // Kick off email verification (delivered via Resend SMTP).
      try {
        await locals.pb.collection('users').requestVerification(parsed.data.email);
      } catch {
        // Non-fatal: verification email can be re-sent later.
      }
    } catch (e: any) {
      const data = e?.response?.data ?? {};
      const errors: Record<string, string[]> = {};
      if (data.username) errors.username = ['That username is already taken.'];
      if (data.email) errors.email = ['That email is already registered.'];
      const message = Object.keys(errors).length ? undefined : 'Could not create your account. Please try again.';
      return fail(400, {
        errors,
        error: message,
        values: { ...raw, password: '', passwordConfirm: '' }
      });
    }

    throw redirect(303, '/');
  }
};
