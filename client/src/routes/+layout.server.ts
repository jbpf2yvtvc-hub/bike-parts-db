import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

const PUBLIC_ROUTES = ['/login', '/register', '/reset-password'];

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

// Route guard (§step 4). Unauthenticated users are sent to /login; already
// authenticated users are bounced away from the auth pages.
export const load: LayoutServerLoad = ({ locals, url }) => {
  const pub = isPublic(url.pathname);
  if (!locals.user && !pub) {
    throw redirect(303, `/login?redirectTo=${encodeURIComponent(url.pathname + url.search)}`);
  }
  if (locals.user && pub) {
    throw redirect(303, '/');
  }
  return { user: locals.user };
};
