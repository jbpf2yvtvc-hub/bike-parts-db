import type { Handle } from '@sveltejs/kit';
import { createPocketBase } from '$lib/server/pb';
import { AUTH_COOKIE } from '$lib/server/auth';

/**
 * Per-request PocketBase instance. Rehydrates auth from the HttpOnly cookie,
 * refreshes the token, exposes the authed user on locals, and writes the
 * refreshed (or cleared) cookie back on the response.
 */
export const handle: Handle = async ({ event, resolve }) => {
  const pb = createPocketBase();
  event.locals.pb = pb;

  // Load auth state from the incoming Cookie header.
  pb.authStore.loadFromCookie(event.request.headers.get('cookie') ?? '', AUTH_COOKIE);

  try {
    if (pb.authStore.isValid) {
      // Verify + refresh the token against PocketBase.
      await pb.collection('users').authRefresh();
    }
  } catch {
    // Invalid/expired token — drop it.
    pb.authStore.clear();
  }

  event.locals.user = pb.authStore.record ?? null;

  const response = await resolve(event, {
    filterSerializedResponseHeaders: (name) => name === 'content-type'
  });

  // Persist refreshed/cleared auth as an HttpOnly cookie.
  response.headers.append(
    'set-cookie',
    pb.authStore.exportToCookie(
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 14
      },
      AUTH_COOKIE
    )
  );

  return response;
};
