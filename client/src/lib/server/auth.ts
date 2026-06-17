/**
 * Session cookie helpers — SERVER ONLY.
 *
 * The PocketBase auth token is stored in an HttpOnly cookie set server-side,
 * never readable by JS (§2.4). We use the SDK's own cookie (de)serialisers,
 * which read/write the `pb_auth` cookie from the raw Cookie header.
 */
import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export const AUTH_COOKIE = 'pb_auth';

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'Lax' as const,
  path: '/',
  // 14 days; PocketBase refreshes the token on authenticated requests.
  maxAge: 60 * 60 * 24 * 14
};

/** Serialise the current authStore to a Set-Cookie string for the response. */
export function exportAuthCookie(event: RequestEvent): string {
  return event.locals.pb.authStore.exportToCookie(cookieOptions, AUTH_COOKIE);
}

/** Guard a load/action: throw a redirect to /login if not authenticated. */
export function requireUser(event: RequestEvent) {
  const user = event.locals.user;
  if (!user) {
    const dest = encodeURIComponent(event.url.pathname + event.url.search);
    throw redirect(303, `/login?redirectTo=${dest}`);
  }
  return user;
}
