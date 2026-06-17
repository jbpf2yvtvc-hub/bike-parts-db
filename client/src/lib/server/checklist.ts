/** Server helpers for the Build Checklist — SERVER ONLY. */
import type PocketBase from 'pocketbase';
import {
  DEFAULT_CONFIG,
  type ChecklistConfig,
  type BarAxis,
  type BrakeAxis,
  type Chainrings,
  type ForkAxis,
  type RearSpeeds,
  type Tension
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

const FORKS: ForkAxis[] = ['threaded', 'threadless'];
const BARS: BarAxis[] = ['flat', 'drop'];
const BRAKES: BrakeAxis[] = ['canti', 'vbrake', 'cp', 'disc-short', 'disc-long'];
const CHAINRINGS: Chainrings[] = ['1', '2', '3'];
const REAR_SPEEDS: RearSpeeds[] = ['1', '6', '7', '8', '9', '10', '11', '12'];
const TENSIONS: Tension[] = ['horizontal', 'tensioner', 'ebb'];

function pick<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/** Coerce arbitrary input into a valid, internally-consistent config. */
export function normalizeConfig(raw: Record<string, unknown> | null | undefined): ChecklistConfig {
  const r = raw ?? {};
  const cfg: ChecklistConfig = {
    fork: pick(r.fork, FORKS, DEFAULT_CONFIG.fork),
    bar: pick(r.bar, BARS, DEFAULT_CONFIG.bar),
    brake: pick(r.brake, BRAKES, DEFAULT_CONFIG.brake),
    chainrings: pick(r.chainrings, CHAINRINGS, DEFAULT_CONFIG.chainrings),
    rear_speeds: pick(r.rear_speeds, REAR_SPEEDS, DEFAULT_CONFIG.rear_speeds),
    tension: pick(r.tension, TENSIONS, DEFAULT_CONFIG.tension)
  };
  // The `tension` axis only applies to single-speed builds (§9.3).
  if (cfg.rear_speeds !== '1') cfg.tension = 'horizontal';
  return cfg;
}
