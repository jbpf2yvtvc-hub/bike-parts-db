import type { PageServerLoad } from './$types';
import { requireUser } from '$lib/server/auth';
import { listSchemas } from '$lib/schema-utils';
import type { PartRecord } from '$lib/types';

export const load: PageServerLoad = async (event) => {
  const user = requireUser(event);
  const pb = event.locals.pb;

  const typeFilter = event.url.searchParams.get('type') ?? '';
  const disposition = event.url.searchParams.get('disposition') ?? '';

  const clauses = [`owner = '${user.id}'`];
  if (typeFilter) clauses.push(`type_id = '${typeFilter}'`);
  if (disposition) clauses.push(`disposition = '${disposition}'`);

  const parts = await pb.collection('parts').getFullList({
    filter: clauses.join(' && '),
    sort: '-created',
    expand: 'bikes'
  });

  return {
    parts: parts as unknown as PartRecord[],
    schemas: listSchemas().map((s) => ({ type_id: s.type_id, label: s.label })),
    typeFilter,
    disposition
  };
};
