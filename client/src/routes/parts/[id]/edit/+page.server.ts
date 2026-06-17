import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth';
import { getSchema } from '$lib/schema-utils';
import { loadBikeOptions, parsePartForm, toRecord } from '$lib/server/parts';

export const load: PageServerLoad = async (event) => {
  const user = requireUser(event);
  let part;
  try {
    part = await event.locals.pb.collection('parts').getOne(event.params.id);
  } catch {
    throw error(404, 'Part not found');
  }
  const schema = getSchema(part.type_id);
  if (!schema) throw error(400, `Unknown part type: ${part.type_id}`);

  return {
    part,
    schema,
    bikes: await loadBikeOptions(event.locals.pb, user.id)
  };
};

export const actions: Actions = {
  default: async (event) => {
    requireUser(event);
    const form = await event.request.formData();
    const typeId = String(form.get('type_id') ?? '');
    const schema = getSchema(typeId);
    if (!schema) return fail(400, { error: 'Unknown part type.' });

    const parsed = parsePartForm(schema, form);
    if (!parsed.ok) {
      return fail(400, { errors: parsed.errors, values: parsed.rawAttributes, meta: parsed.meta });
    }

    // Rebuild the searchable tags index on every save (§6.2). `owner` is left
    // untouched so the owner-scoped update rule still applies.
    const record = toRecord(typeId, '', parsed) as Record<string, unknown>;
    delete record.owner;
    await event.locals.pb.collection('parts').update(event.params.id, record);

    throw redirect(303, `/parts/${event.params.id}`);
  }
};
