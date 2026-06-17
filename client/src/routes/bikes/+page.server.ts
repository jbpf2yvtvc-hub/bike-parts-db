import type { PageServerLoad } from './$types';
import { requireUser } from '$lib/server/auth';
import type { BikeRecord } from '$lib/types';

export const load: PageServerLoad = async (event) => {
  const user = requireUser(event);
  const bikes = await event.locals.pb
    .collection('bikes')
    .getFullList({ filter: `owner = '${user.id}'`, sort: '-is_active,name' });
  return { bikes: bikes as unknown as BikeRecord[] };
};
