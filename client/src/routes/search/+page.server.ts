import type { PageServerLoad } from './$types';
import { requireUser } from '$lib/server/auth';
import type { PartRecord } from '$lib/types';

// Keyword + metadata search (§6.2). Filters server-side against the `tags`
// index (concatenated searchable attribute values, rebuilt on every save) and
// `type_id`.
export const load: PageServerLoad = async (event) => {
  const user = requireUser(event);
  const q = (event.url.searchParams.get('q') ?? '').trim();
  if (!q) return { q, results: [] };

  const safe = q.replace(/'/g, "\\'").toLowerCase();
  const results = await event.locals.pb.collection('parts').getFullList({
    filter: `owner = '${user.id}' && (tags ~ '${safe}' || type_id ~ '${safe}')`,
    sort: '-created',
    expand: 'bikes'
  });

  return { q, results: results as unknown as PartRecord[] };
};
