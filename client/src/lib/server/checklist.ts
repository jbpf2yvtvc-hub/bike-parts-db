/** Server helpers for the Build Checklist — SERVER ONLY. */
import type PocketBase from 'pocketbase';
import {
  DEFAULT_CONFIG,
  type ChecklistConfig,
  type ChecklistContext,
  type BarAxis,
  type Chainrings,
  type ForkAxis,
  type RearSpeeds,
  type Tension,
  type ShiftingMode
} from '$lib/checklist-data';

/** One progress record per bike; create with defaults on first visit. */
export async function getOrCreateProgress(pb: PocketBase, bikeId: string, ownerId: string) {
  try {
    return await pb.collection('checklist_progress').getFirstListItem(`bike = '${bikeId}'`);
  } catch {
    return await pb.collection('checklist_progress').create({
      bike: bikeId,
      owner: ownerId,
      config: DEFAULT_CONFIG,
      checked_items: [],
      part_links: {}
    });
  }
}

/**
 * Remove every checklist link (and its auto-check) that points at a given part
 * on a given bike's progress. Used when a part is switched off this bike to
 * another, so the old bike's checklist no longer shows it linked.
 */
export async function removePartFromBikeLinks(
  pb: PocketBase,
  bikeId: string,
  partId: string
): Promise<void> {
  let progress;
  try {
    progress = await pb.collection('checklist_progress').getFirstListItem(`bike = '${bikeId}'`);
  } catch {
    return; // no progress for that bike
  }
  const links: Record<string, string> =
    progress.part_links && typeof progress.part_links === 'object' ? { ...progress.part_links } : {};
  const removedKeys = Object.entries(links)
    .filter(([, id]) => id === partId)
    .map(([key]) => key);
  if (removedKeys.length === 0) return;

  for (const key of removedKeys) delete links[key];
  const checked = (Array.isArray(progress.checked_items) ? progress.checked_items : []).filter(
    (k: string) => !removedKeys.includes(k)
  );
  await pb.collection('checklist_progress').update(progress.id, {
    part_links: links,
    checked_items: checked
  });
}

const FORKS: ForkAxis[] = ['threaded', 'threadless'];
const BARS: BarAxis[] = ['flat', 'drop', 'cruiser', 'alt'];
const CHAINRINGS: Chainrings[] = ['1', '2', '3'];
const REAR_SPEEDS: RearSpeeds[] = ['1', '6', '7', '8', '9', '10', '11', '12'];
const TENSIONS: Tension[] = ['horizontal', 'tensioner', 'ebb'];
const SHIFTING: ShiftingMode[] = ['indexed', 'friction'];

function pick<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/** Coerce arbitrary input into a valid, internally-consistent config. */
export function normalizeConfig(raw: Record<string, unknown> | null | undefined): ChecklistConfig {
  const r = raw ?? {};
  const cfg: ChecklistConfig = {
    fork: pick(r.fork, FORKS, DEFAULT_CONFIG.fork),
    bar: pick(r.bar, BARS, DEFAULT_CONFIG.bar),
    chainrings: pick(r.chainrings, CHAINRINGS, DEFAULT_CONFIG.chainrings),
    rear_speeds: pick(r.rear_speeds, REAR_SPEEDS, DEFAULT_CONFIG.rear_speeds),
    tension: pick(r.tension, TENSIONS, DEFAULT_CONFIG.tension),
    front_shifting: pick(r.front_shifting, SHIFTING, DEFAULT_CONFIG.front_shifting),
    rear_shifting: pick(r.rear_shifting, SHIFTING, DEFAULT_CONFIG.rear_shifting),
    // Checkboxes arrive as boolean (JSON) or 'on'/'true' (form data).
    stem_converter: r.stem_converter === true || r.stem_converter === 'on' || r.stem_converter === 'true'
  };
  // The `tension` axis only applies to single-speed builds (§9.3).
  if (cfg.rear_speeds !== '1') cfg.tension = 'horizontal';
  // A stem converter only makes sense on a threaded steerer.
  if (cfg.fork !== 'threaded') cfg.stem_converter = false;
  return cfg;
}

const posIs = (p: any, side: string) => {
  const pos = String(p?.attributes?.position ?? '').toLowerCase();
  return pos.includes(side) || pos.includes('either');
};

/**
 * Derive the non-configurator context for a build from its linked parts:
 * integrated-clamp flag, front/rear brake mounts (from the fork/frame), and
 * front/rear caliper styles (to constrain the fork/frame pickers). A part is
 * located by its explicit link if present, else by an on-bike part of the right
 * type/position. `onBikeParts` is the list of parts installed on this bike.
 */
export async function buildChecklistContext(
  pb: PocketBase,
  explicitLinks: Record<string, string>,
  onBikeParts: any[]
): Promise<ChecklistContext> {
  const byId: Record<string, any> = {};
  for (const p of onBikeParts) byId[p.id] = p;

  const get = async (id?: string) => {
    if (!id) return null;
    if (byId[id]) return byId[id];
    try {
      return await pb.collection('parts').getOne(id);
    } catch {
      return null;
    }
  };

  const frame =
    (await get(explicitLinks['frame::frame'])) ??
    onBikeParts.find((p) => p.type_id === 'frame') ??
    null;
  const fork =
    (await get(explicitLinks['frame::fork'])) ??
    onBikeParts.find((p) => p.type_id === 'fork') ??
    null;
  const frontCaliper =
    (await get(explicitLinks['brakes::caliper-front'])) ??
    onBikeParts.find((p) => p.type_id === 'brake_caliper' && posIs(p, 'front')) ??
    null;
  const rearCaliper =
    (await get(explicitLinks['brakes::caliper-rear'])) ??
    onBikeParts.find((p) => p.type_id === 'brake_caliper' && posIs(p, 'rear')) ??
    null;

  return {
    frameIntegratedClamp: !!frame?.attributes?.integrated_seatpost_clamp,
    forkBrakeMount: fork?.attributes?.brake_mount,
    frameBrakeMount: frame?.attributes?.brake_mount,
    frontCaliperStyle: frontCaliper?.attributes?.style,
    rearCaliperStyle: rearCaliper?.attributes?.style
  };
}
