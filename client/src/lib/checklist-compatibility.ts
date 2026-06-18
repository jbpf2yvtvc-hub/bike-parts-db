/**
 * Checklist part-linking compatibility (§9.5).
 *
 * `getCompatibilityFilter(itemKey, cfg)` returns a PocketBase filter string
 * (the type/attribute clause, owner scoping is added by the caller) — or null
 * when an item has no picker (e.g. tools/consumables, or an item not visible
 * in the current config).
 *
 * Some rows need a TWO-STEP filter (§9.5): PocketBase cannot evaluate the
 * freehub matrix, so the server first queries by type/attributes, then applies
 * `classifyPart()` as a TS predicate before rendering. Cassette drops
 * incompatible parts; rear-wheel surfaces them in a separate group.
 *
 * IMPORTANT: these filters depend on the exact attribute field ids and option
 * strings in schemas/*.json. Keep the two in sync — a mismatch silently yields
 * empty pickers (§11 risk).
 */
import { visibleItemKeys, type ChecklistConfig, type ChecklistContext } from './checklist-data';
import { freehubCompatible } from './freehub-compatibility';
import type { PartRecord } from './types';

/** type_id that each item links to (drives the "Add a new part" link). */
const ITEM_TYPE: Record<string, string> = {
  'frame::frame': 'frame',
  'frame::fork': 'fork',
  'frame::headset-threaded': 'headset',
  'frame::headset-threadless': 'headset',
  'stem::stem-quill': 'stem',
  'stem::stem-threadless': 'stem',
  'bars::handlebar-flat': 'handlebar',
  'bars::handlebar-drop': 'handlebar',
  'bars::handlebar-cruiser': 'handlebar',
  'bars::handlebar-alt': 'handlebar',
  'bb::bottom-bracket': 'bottom_bracket',
  'bb::eccentric-bb': 'eccentric_bb',
  'bb::crankset': 'crankset',
  'drivetrain::left-shifter': 'shifter',
  'drivetrain::right-shifter': 'shifter',
  'drivetrain::front-derailleur': 'derailleur_front',
  'drivetrain::rear-derailleur': 'derailleur_rear',
  'drivetrain::cassette': 'cassette',
  'drivetrain::chain': 'chain',
  'drivetrain::cog': 'cog',
  'drivetrain::chain-tensioner': 'chain_tensioner',
  'brakes::caliper-canti': 'brake_caliper',
  'brakes::caliper-vbrake': 'brake_caliper',
  'brakes::caliper-cp': 'brake_caliper',
  'brakes::caliper-disc': 'brake_caliper',
  'brakes::lever': 'brake_lever',
  'wheels::front-wheel': 'wheel',
  'wheels::rear-wheel': 'wheel',
  'seatpost::seatpost': 'seatpost',
  'seatpost::seatpost-clamp': 'seatpost_clamp',
  'seatpost::saddle': 'saddle'
};

const isDisc = (cfg: ChecklistConfig) => cfg.brake === 'disc-short' || cfg.brake === 'disc-long';

export function getTypeIdForItem(itemKey: string): string | null {
  return ITEM_TYPE[itemKey] ?? null;
}

export function getCompatibilityFilter(
  itemKey: string,
  cfg: ChecklistConfig
): string | null {
  const rs = cfg.rear_speeds;

  switch (itemKey) {
    case 'frame::frame':
      return "type_id='frame'";

    case 'frame::fork':
      return isDisc(cfg)
        ? "type_id='fork' && attributes.brake_mount~'disc'"
        : "type_id='fork' && attributes.brake_mount~'boss'";

    case 'frame::headset-threaded':
      return "type_id='headset' && attributes.standard~'threaded'";
    case 'frame::headset-threadless':
      return "type_id='headset' && attributes.standard~'threadless'";

    case 'stem::stem-quill':
      return "type_id='stem' && attributes.style~'quill'";
    case 'stem::stem-threadless':
      return "type_id='stem' && attributes.style~'threadless'";

    case 'bars::handlebar-flat':
      return "type_id='handlebar' && attributes.style~'flat'";
    case 'bars::handlebar-drop':
      return "type_id='handlebar' && attributes.style~'drop'";
    case 'bars::handlebar-cruiser':
      return "type_id='handlebar' && attributes.style~'cruiser'";
    case 'bars::handlebar-alt':
      return "type_id='handlebar' && attributes.style~'alt'";

    case 'bb::bottom-bracket':
      return "type_id='bottom_bracket'";
    case 'bb::eccentric-bb':
      return "type_id='eccentric_bb'";
    case 'bb::crankset':
      return `type_id='crankset' && attributes.chainring_count='${cfg.chainrings}'`;

    case 'drivetrain::front-derailleur':
      // Indexed: exact chainring count. Friction: any FD rated for >= the
      // chainring count (post-fetch numeric check, so no speed clause here).
      return cfg.front_shifting === 'friction'
        ? "type_id='derailleur_front'"
        : `type_id='derailleur_front' && attributes.max_chainrings='${cfg.chainrings}'`;
    case 'drivetrain::rear-derailleur':
      // Indexed: exact speed. Friction: any RD that shifts >= rear_speeds
      // (post-fetch numeric check, so no speed clause here).
      return cfg.rear_shifting === 'friction'
        ? "type_id='derailleur_rear'"
        : `type_id='derailleur_rear' && attributes.speed='${rs}'`;
    case 'drivetrain::cassette':
      return `type_id='cassette' && attributes.speed='${rs}'`; // + freehub post-fetch
    case 'drivetrain::chain':
      return rs === '1'
        ? "type_id='chain' && attributes.width~'1/8'"
        : `type_id='chain' && attributes.speed='${rs}'`;
    case 'drivetrain::cog':
      return "type_id='cog'";
    case 'drivetrain::chain-tensioner':
      return "type_id='chain_tensioner'";

    case 'drivetrain::left-shifter':
      return "type_id='shifter' && attributes.hand='left'";
    case 'drivetrain::right-shifter':
      return "type_id='shifter' && attributes.hand='right'";

    case 'brakes::caliper-canti':
      return "type_id='brake_caliper' && attributes.style~'cantilever'";
    case 'brakes::caliper-vbrake':
      return "type_id='brake_caliper' && attributes.style~'v-brake'";
    case 'brakes::caliper-cp':
      return "type_id='brake_caliper' && attributes.style~'center-pull'";
    case 'brakes::caliper-disc':
      return "type_id='brake_caliper' && attributes.style~'disc'";

    case 'brakes::lever': {
      if (cfg.bar === 'drop') return "type_id='brake_lever' && attributes.mount~'drop'";
      // flat bar: short pull for canti/center-pull/short-pull disc, long for V-brake/long-pull disc
      const longPull = cfg.brake === 'vbrake' || cfg.brake === 'disc-long';
      return `type_id='brake_lever' && attributes.pull~'${longPull ? 'long' : 'short'}' && attributes.mount~'flat'`;
    }

    case 'wheels::front-wheel':
      return isDisc(cfg)
        ? "type_id='wheel' && attributes.position='front' && attributes.brake_type~'disc'"
        : "type_id='wheel' && attributes.position='front' && attributes.brake_type~'rim'";

    case 'wheels::rear-wheel':
      if (rs === '1') {
        // single-speed / track / flip-flop hubs (ORed since PB ~ is contains, not alternation)
        return "type_id='wheel' && attributes.position='rear' && (attributes.freehub_standard~'Single-speed' || attributes.freehub_standard~'Track' || attributes.freehub_standard~'Flip-flop')";
      }
      return "type_id='wheel' && attributes.position='rear'"; // + freehub post-fetch (grouped)

    case 'seatpost::seatpost':
      return "type_id='seatpost'";
    case 'seatpost::seatpost-clamp':
      return "type_id='seatpost_clamp'";
    case 'seatpost::saddle':
      return "type_id='saddle'";

    default:
      return null;
  }
}

/** Does this item show incompatible-but-owned parts in a separate group? */
export function hasIncompatibleGroup(itemKey: string): boolean {
  return itemKey === 'wheels::rear-wheel';
}

/** Does this item apply a post-fetch predicate at all (two-step filter)? */
export function hasPostFetch(itemKey: string, cfg: ChecklistConfig): boolean {
  if (itemKey === 'drivetrain::cassette' || itemKey === 'wheels::rear-wheel') return true;
  // Friction shifting uses a numeric "at least N speeds" check that PB can't do.
  if (itemKey === 'drivetrain::rear-derailleur') return cfg.rear_shifting === 'friction';
  if (itemKey === 'drivetrain::front-derailleur') return cfg.front_shifting === 'friction';
  return false;
}

export interface PostFetchContext {
  /** freehub_standard of an already-linked rear wheel, if any. */
  linkedRearWheelFreehub?: string;
}

/**
 * Classify a fetched part as compatible or not, for the two-step freehub rows.
 * Non-freehub items are always 'compatible' (their PB filter is sufficient).
 */
export function classifyPart(
  itemKey: string,
  cfg: ChecklistConfig,
  part: PartRecord,
  ctx: PostFetchContext = {}
): 'compatible' | 'incompatible' {
  if (itemKey === 'drivetrain::cassette') {
    const fh = part.attributes?.freehub_standard;
    if (!freehubCompatible(fh, cfg.rear_speeds)) return 'incompatible';
    // If a rear wheel is already linked, require a matching freehub.
    if (ctx.linkedRearWheelFreehub && fh !== ctx.linkedRearWheelFreehub) {
      return 'incompatible';
    }
    return 'compatible';
  }

  if (itemKey === 'wheels::rear-wheel') {
    const fh = part.attributes?.freehub_standard;
    return freehubCompatible(fh, cfg.rear_speeds) ? 'compatible' : 'incompatible';
  }

  // Friction rear shifting: a derailleur that shifts >= rear_speeds works.
  if (itemKey === 'drivetrain::rear-derailleur') {
    const speed = Number(part.attributes?.speed);
    return Number.isFinite(speed) && speed >= Number(cfg.rear_speeds)
      ? 'compatible'
      : 'incompatible';
  }

  // Friction front shifting: an FD rated for >= the chainring count works.
  if (itemKey === 'drivetrain::front-derailleur') {
    const max = Number(part.attributes?.max_chainrings);
    return Number.isFinite(max) && max >= Number(cfg.chainrings) ? 'compatible' : 'incompatible';
  }

  return 'compatible';
}

/**
 * Minimal evaluator for the subset of PocketBase filter syntax that
 * `getCompatibilityFilter` produces: comparisons (`field='v'` / `field~'v'`)
 * over `type_id` and `attributes.<name>`, combined with `&&`, `||`, and
 * parentheses. Evaluating the generated string (rather than duplicating the
 * logic) keeps a single source of truth for compatibility (§11 risk).
 */
function evalFilter(filter: string, part: PartRecord): boolean {
  let i = 0;
  const s = filter;
  const ws = () => {
    while (i < s.length && s[i] === ' ') i++;
  };

  const parseComparison = (): boolean => {
    ws();
    let start = i;
    while (i < s.length && s[i] !== '=' && s[i] !== '~') i++;
    const field = s.slice(start, i).trim();
    const op = s[i];
    i++; // consume operator
    ws();
    // value is single-quoted
    i++; // opening quote
    start = i;
    while (i < s.length && s[i] !== "'") i++;
    const value = s.slice(start, i);
    i++; // closing quote

    let actual: string;
    if (field === 'type_id') actual = String(part.type_id ?? '');
    else if (field.startsWith('attributes.')) {
      const raw = part.attributes?.[field.slice('attributes.'.length)];
      actual = raw == null ? '' : String(raw);
    } else actual = '';

    return op === '='
      ? actual === value
      : actual.toLowerCase().includes(value.toLowerCase());
  };

  const parsePrimary = (): boolean => {
    ws();
    if (s[i] === '(') {
      i++; // (
      const v = parseOr();
      ws();
      if (s[i] === ')') i++;
      return v;
    }
    return parseComparison();
  };

  function parseAnd(): boolean {
    let v = parsePrimary();
    ws();
    while (s.startsWith('&&', i)) {
      i += 2;
      v = parsePrimary() && v;
      ws();
    }
    return v;
  }

  function parseOr(): boolean {
    let v = parseAnd();
    ws();
    while (s.startsWith('||', i)) {
      i += 2;
      v = parseAnd() || v;
      ws();
    }
    return v;
  }

  return parseOr();
}

/**
 * Find the checklist item a part belongs to under the current config, by
 * testing it against each visible item's compatibility filter. Returns the
 * item key (e.g. `wheels::rear-wheel`) or null if the part fits no slot.
 * Used to auto-link parts that are installed on the bike.
 */
export function matchItemForPart(
  part: PartRecord,
  cfg: ChecklistConfig,
  ctx: ChecklistContext = {}
): string | null {
  for (const key of visibleItemKeys(cfg, ctx)) {
    const filter = getCompatibilityFilter(key, cfg);
    if (filter && evalFilter(filter, part)) return key;
  }
  return null;
}
