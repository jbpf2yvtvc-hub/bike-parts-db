import type { PageServerLoad } from './$types';
import { requireUser } from '$lib/server/auth';
import type { BikeRecord, PartRecord } from '$lib/types';

export const load: PageServerLoad = async (event) => {
  const user = requireUser(event);
  const pb = event.locals.pb;
  const owner = `owner = '${user.id}'`;

  const [parts, bikes] = await Promise.all([
    pb.collection('parts').getList(1, 5, { sort: '-created', filter: owner, expand: 'bike' }),
    pb.collection('bikes').getList(1, 5, { sort: '-created', filter: owner })
  ]);

  return {
    recentParts: parts.items as unknown as PartRecord[],
    partsTotal: parts.totalItems,
    recentBikes: bikes.items as unknown as BikeRecord[],
    bikesTotal: bikes.totalItems,
    displayName: (user as any).display_name || (user as any).username
  };
};
