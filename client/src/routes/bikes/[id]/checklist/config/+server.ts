import type { RequestHandler } from './$types';
import { json, redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth';
import { getOrCreateProgress, normalizeConfig } from '$lib/server/checklist';

// Configurator persistence (§9.3). No-JS: an HTML form POST that redirects back
// to the checklist. JS: a JSON POST that returns the normalised config.
export const POST: RequestHandler = async (event) => {
  const user = requireUser(event);
  const pb = event.locals.pb;
  const contentType = event.request.headers.get('content-type') ?? '';

  let raw: Record<string, unknown>;
  if (contentType.includes('application/json')) {
    raw = await event.request.json();
  } else {
    raw = Object.fromEntries(await event.request.formData());
  }

  const config = normalizeConfig(raw);
  const progress = await getOrCreateProgress(pb, event.params.id, user.id);
  await pb.collection('checklist_progress').update(progress.id, { config });

  if (contentType.includes('application/json')) return json({ config });
  throw redirect(303, `/bikes/${event.params.id}/checklist`);
};
