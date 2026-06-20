import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth';
import { getSchema, listSchemas } from '$lib/schema-utils';
import {
  loadBikeOptions,
  loadAssociationOptions,
  parsePartForm,
  toRecord
} from '$lib/server/parts';

export const load: PageServerLoad = async (event) => {
  const user = requireUser(event);
  const typeId = event.url.searchParams.get('type') ?? '';
  const schema = typeId ? getSchema(typeId) : undefined;

  return {
    typeId,
    schema: schema ?? null,
    schemas: listSchemas().map((s) => ({ type_id: s.type_id, label: s.label })),
    bikes: await loadBikeOptions(event.locals.pb, user.id),
    assocOptions: typeId ? await loadAssociationOptions(event.locals.pb, user.id, typeId, {}) : []
  };
};

export const actions: Actions = {
  default: async (event) => {
    const user = requireUser(event);
    const form = await event.request.formData();
    const typeId = String(form.get('type_id') ?? '');
    const schema = getSchema(typeId);
    if (!schema) return fail(400, { error: 'Unknown part type.' });

    const parsed = parsePartForm(schema, form);
    if (!parsed.ok) {
      return fail(400, { errors: parsed.errors, values: parsed.rawAttributes, meta: parsed.meta });
    }

    const record = await event.locals.pb
      .collection('parts')
      .create(toRecord(typeId, user.id, parsed));

    throw redirect(303, `/parts/${record.id}`);
  }
};
