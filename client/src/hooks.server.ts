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
      // Verify + refresh the token against PocketBase on every request.
      //
      // This looks like a candidate for caching/skipping, but don't: authStore
      // .isValid only decodes the JWT and checks `exp` — it does NOT verify the
      // signature. authRefresh() is the only thing that validates the token's
      // signature server-side, so skipping it would let a forged cookie (any
      // future `exp` + a chosen record) authenticate as any user.
      //
      // An in-memory verification cache wouldn't help either: this runs on
      // Cloudflare Workers (adapter-cloudflare) where module state is per-
      // isolate and short-lived, so the hit rate is near zero. A real fix would
      // need a shared store (KV/Durable Object), whose latency is comparable to
      // just making this call. One PocketBase round-trip per request is the
      // correct trade-off for this app.
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
