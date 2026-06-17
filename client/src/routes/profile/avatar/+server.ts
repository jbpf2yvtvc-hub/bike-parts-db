import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

// Avatar proxy: streams the user's avatar from PocketBase server-side so the
// browser never learns the PocketBase URL (§2.2). Returns 404 if no avatar.
export const GET: RequestHandler = async ({ locals, fetch }) => {
  const user = locals.user as any;
  if (!user?.avatar) throw error(404, 'No avatar');

  const url = `${env.POCKETBASE_URL}/api/files/users/${user.id}/${user.avatar}`;
  const res = await fetch(url);
  if (!res.ok) throw error(404, 'No avatar');

  return new Response(res.body, {
    headers: {
      'content-type': res.headers.get('content-type') ?? 'image/jpeg',
      'cache-control': 'private, max-age=300'
    }
  });
};
