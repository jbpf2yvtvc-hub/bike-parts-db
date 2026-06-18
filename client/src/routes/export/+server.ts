import type { RequestHandler } from './$types';
import { requireUser } from '$lib/server/auth';
import { buildExportZip } from '$lib/export';
import type { BikeRecord, PartRecord } from '$lib/types';

// CSV export (§6.3): streams parts.csv + bikes.csv in a zip as an attachment.
export const GET: RequestHandler = async (event) => {
  const user = requireUser(event);
  const pb = event.locals.pb;
  const owner = `owner = '${user.id}'`;

  const [parts, bikes] = await Promise.all([
    pb.collection('parts').getFullList({ filter: owner, sort: 'type_id', expand: 'bikes' }),
    pb.collection('bikes').getFullList({ filter: owner, sort: 'name' })
  ]);

  const zip = await buildExportZip(
    parts as unknown as PartRecord[],
    bikes as unknown as BikeRecord[]
  );

  const date = new Date().toISOString().slice(0, 10);
  return new Response(zip as unknown as BodyInit, {
    headers: {
      'content-type': 'application/zip',
      'content-disposition': `attachment; filename="bike-parts-db-export-${date}.zip"`
    }
  });
};
