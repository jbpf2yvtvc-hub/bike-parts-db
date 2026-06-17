import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth';

export const load: PageServerLoad = (event) => {
  const user = requireUser(event) as any;
  return {
    profile: {
      username: user.username,
      display_name: user.display_name ?? '',
      email: user.email,
      bio: user.bio ?? '',
      phone: user.phone ?? '',
      verified: user.verified,
      hasAvatar: !!user.avatar
    }
  };
};

export const actions: Actions = {
  default: async (event) => {
    const user = requireUser(event) as any;
    const form = await event.request.formData();

    const display_name = String(form.get('display_name') ?? '').trim();
    const bio = String(form.get('bio') ?? '').trim();
    const phone = String(form.get('phone') ?? '').trim();
    const email = String(form.get('email') ?? '').trim();
    const avatar = form.get('avatar');

    if (bio.length > 280) {
      return fail(400, { errors: { bio: 'Bio must be 280 characters or fewer.' } });
    }

    // username is omitted entirely — it is immutable (§2.4) and the collection
    // rule rejects any attempt to change it.
    const data = new FormData();
    data.set('display_name', display_name);
    data.set('bio', bio);
    data.set('phone', phone);
    if (avatar instanceof File && avatar.size > 0) data.set('avatar', avatar);

    try {
      await event.locals.pb.collection('users').update(user.id, data);
    } catch {
      return fail(400, { error: 'Could not save your profile.' });
    }

    // Email changes require re-verification of the new address (§2.4).
    let emailChangeRequested = false;
    if (email && email !== user.email) {
      try {
        await event.locals.pb.collection('users').requestEmailChange(email);
        emailChangeRequested = true;
      } catch {
        return fail(400, { error: 'Could not request the email change.' });
      }
    }

    return { success: true, emailChangeRequested };
  }
};
