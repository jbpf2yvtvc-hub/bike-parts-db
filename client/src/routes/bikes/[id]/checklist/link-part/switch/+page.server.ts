import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth';
import { findItem } from '$lib/checklist-data';
import { partTitle } from '$lib/schema-utils';

// No-JS confirmation page for switching a fully-assigned part onto this bike.
// The confirm form posts to the link-part `?/linkPart` action with confirm=1.
export const load: PageServerLoad = async (event) => {
  requireUser(event);
  const pb = event.locals.pb;
  const bikeId = event.params.id;

  let bike;
  try {
    bike = await pb.collection('bikes').getOne(bikeId);
  } catch {
    throw error(404, 'Bike not found');
  }

  const item = event.url.searchParams.get('item') ?? '';
  const partId = event.url.searchParams.get('partId') ?? '';
  const found = findItem(item);
  if (!found || !partId) throw error(400, 'Unknown item or part');

  let part;
  try {
    part = (await pb.collection('parts').getOne(partId, { expand: 'bikes' })) as any;
  } catch {
    throw error(404, 'Part not found');
  }

  const otherBikes: { id: string; name: string }[] = (part.expand?.bikes ?? [])
    .filter((b: any) => b.id !== bikeId)
    .map((b: any) => ({ id: b.id, name: b.name }));

  return {
    bikeId,
    bikeName: bike.name,
    item,
    partId,
    partTitle: partTitle(part),
    otherBikes
  };
};
