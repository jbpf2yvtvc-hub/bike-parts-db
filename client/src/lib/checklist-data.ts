/**
 * Build Checklist data (§9.2, §9.3).
 *
 * Checklist line items are CODE, not data — version-controlled and bundled at
 * build. PocketBase stores only per-bike progress, links, and config.
 *
 * Each item has a stable kebab-case `id`, unique within its section. The
 * progress/link key is `"<sectionId>::<itemId>"` (e.g. `bb::bottom-bracket`),
 * NEVER the display title — titles can change without orphaning saved progress.
 *
 * `t` (title) and `n` (note) may be a string OR a `(cfg) => string` function,
 * so dynamic titles like "Rear derailleur — 10-speed" regenerate from config.
 */

export type ForkAxis = 'threaded' | 'threadless';
export type BarAxis = 'flat' | 'drop' | 'cruiser' | 'alt';
export type Chainrings = '1' | '2' | '3';
export type RearSpeeds = '1' | '6' | '7' | '8' | '9' | '10' | '11' | '12';
export type Tension = 'horizontal' | 'tensioner' | 'ebb';
export type ShiftingMode = 'indexed' | 'friction';

export interface ChecklistConfig {
  fork: ForkAxis;
  bar: BarAxis;
  chainrings: Chainrings;
  rear_speeds: RearSpeeds;
  tension: Tension;
  /** Front/rear shifter type. Friction relaxes derailleur speed matching to
   *  "supports at least N speeds" instead of exact (§9.5). */
  front_shifting: ShiftingMode;
  rear_shifting: ShiftingMode;
  /** Threaded steerers only: use a quill→threadless stem converter, which lets
   *  threadless stems be linked. Forced false unless fork is `threaded`. */
  stem_converter: boolean;
}

/**
 * Extra, non-configurator context derived from the build's linked parts. Brake
 * type is no longer a configurator axis — it comes from the linked fork (front)
 * and frame (rear). These also feed bidirectional fork↔caliper / frame↔caliper
 * compatibility (§9.5 update).
 */
export interface ChecklistContext {
  frameIntegratedClamp?: boolean;
  /** `brake_mount` of the linked fork → drives front brake/lever/wheel. */
  forkBrakeMount?: string;
  /** `brake_mount` of the linked frame → drives rear brake/lever/wheel. */
  frameBrakeMount?: string;
  /** `style` of the linked front caliper → constrains the fork picker. */
  frontCaliperStyle?: string;
  /** `style` of the linked rear caliper → constrains the frame picker. */
  rearCaliperStyle?: string;
}

export const DEFAULT_CONFIG: ChecklistConfig = {
  fork: 'threaded',
  bar: 'flat',
  chainrings: '2',
  rear_speeds: '10',
  tension: 'horizontal',
  front_shifting: 'indexed',
  rear_shifting: 'indexed',
  stem_converter: false
};

type Dyn<T> = T | ((cfg: ChecklistConfig) => T);

export interface ChecklistItem {
  id: string;
  t: Dyn<string>;
  n?: Dyn<string>;
  /** Visibility predicate; defaults to always visible. */
  visible?: (cfg: ChecklistConfig, ctx: ChecklistContext) => boolean;
  /** If false, the item has no inventory part picker (tools/consumables). */
  picker?: boolean;
}

export interface ChecklistSection {
  id: string;
  title: string;
  items: ChecklistItem[];
}

const isDerailleur = (cfg: ChecklistConfig) => cfg.rear_speeds !== '1';
const hasFront = (cfg: ChecklistConfig) => cfg.chainrings === '2' || cfg.chainrings === '3';

export const SECTIONS: ChecklistSection[] = [
  {
    id: 'frame',
    title: 'Frame & front end',
    items: [
      {
        id: 'frame',
        t: 'Frame',
        n: 'The frame’s rear brake mount drives the rear brake/lever/wheel options. If a rear brake is already linked, only matching frames are shown.'
      },
      {
        id: 'fork',
        t: 'Fork',
        n: 'The fork’s front brake mount drives the front brake/lever/wheel options. If a front brake is already linked, only matching forks are shown.'
      },
      {
        id: 'headset-threaded',
        t: 'Headset — threaded',
        visible: (cfg) => cfg.fork === 'threaded'
      },
      {
        id: 'headset-threadless',
        t: 'Headset — threadless',
        visible: (cfg) => cfg.fork === 'threadless'
      }
    ]
  },
  {
    id: 'stem',
    title: 'Cockpit',
    items: [
      {
        id: 'stem-quill',
        t: (cfg) =>
          cfg.stem_converter ? 'Stem — quill or threadless (converter)' : 'Stem — quill',
        visible: (cfg) => cfg.fork === 'threaded'
      },
      {
        id: 'stem-threadless',
        t: 'Stem — threadless',
        visible: (cfg) => cfg.fork === 'threadless'
      },
      // Seatpost & saddle now live under Cockpit (no separate section).
      { id: 'seatpost', t: 'Seatpost' },
      {
        id: 'seatpost-clamp',
        t: 'Seatpost clamp (collar)',
        // Hidden when the frame has an integrated clamp (binder bolt instead).
        visible: (_cfg, ctx) => !ctx.frameIntegratedClamp
      },
      {
        id: 'binder-bolt',
        t: 'Binder bolt (standard or QR)',
        n: 'The frame has an integrated seatpost clamp — you just need the binder bolt (a standard bolt or a quick-release).',
        // Shown only when the frame has an integrated clamp. No part picker.
        visible: (_cfg, ctx) => !!ctx.frameIntegratedClamp
      },
      { id: 'saddle', t: 'Saddle' }
    ]
  },
  {
    id: 'bars',
    title: 'Handlebar',
    items: [
      { id: 'handlebar-flat', t: 'Handlebar — flat', visible: (cfg) => cfg.bar === 'flat' },
      { id: 'handlebar-drop', t: 'Handlebar — drop', visible: (cfg) => cfg.bar === 'drop' },
      {
        id: 'handlebar-cruiser',
        t: 'Handlebar — cruiser/multi-position',
        visible: (cfg) => cfg.bar === 'cruiser'
      },
      { id: 'handlebar-alt', t: 'Handlebar — alt bars', visible: (cfg) => cfg.bar === 'alt' }
    ]
  },
  {
    id: 'bb',
    title: 'Bottom bracket & crank',
    items: [
      {
        id: 'bottom-bracket',
        t: 'Bottom bracket',
        // Hidden when an eccentric BB takes its place.
        visible: (cfg) => cfg.tension !== 'ebb'
      },
      {
        id: 'eccentric-bb',
        t: 'Eccentric bottom bracket (EBB)',
        n: 'The EBB is the bottom bracket for this build — used to tension a single-speed chain in vertical dropouts.',
        visible: (cfg) => cfg.rear_speeds === '1' && cfg.tension === 'ebb'
      },
      {
        id: 'crankset',
        t: (cfg) =>
          cfg.chainrings === '1'
            ? 'Crankset — 1×'
            : `Crankset — ${cfg.chainrings}×`
      }
    ]
  },
  {
    id: 'drivetrain',
    title: 'Drivetrain',
    items: [
      // Shifters first — friction/indexed choice here affects which
      // derailleurs are offered below.
      {
        id: 'left-shifter',
        t: 'Left shifter (front)',
        visible: hasFront
      },
      {
        id: 'right-shifter',
        t: 'Right shifter (rear)'
      },
      {
        id: 'front-derailleur',
        t: 'Front derailleur',
        visible: hasFront
      },
      {
        id: 'rear-derailleur',
        t: (cfg) => `Rear derailleur — ${cfg.rear_speeds}-speed`,
        visible: isDerailleur
      },
      {
        id: 'cassette',
        t: (cfg) => `Cassette — ${cfg.rear_speeds}-speed`,
        n: 'The picker pre-filters by the freehub × speed matrix; if a rear wheel is already linked it also requires a matching freehub.',
        visible: isDerailleur
      },
      {
        id: 'cog',
        t: 'Cog — single-speed / track',
        visible: (cfg) => cfg.rear_speeds === '1'
      },
      {
        id: 'chain',
        t: (cfg) =>
          cfg.rear_speeds === '1'
            ? 'Chain — single-speed (1/8")'
            : `Chain — ${cfg.rear_speeds}-speed (3/32")`
      },
      {
        id: 'chain-tensioner',
        t: 'Chain tensioner',
        visible: (cfg) => cfg.rear_speeds === '1' && cfg.tension === 'tensioner'
      }
    ]
  },
  {
    id: 'brakes',
    title: 'Brakes',
    items: [
      // Calipers are front/rear (driven by the fork/frame brake mount). Levers
      // are left/right (decoupled from which brake they pull). Hidden when the
      // corresponding mount is 'none' (brakeless).
      {
        id: 'caliper-front',
        t: 'Front brake',
        visible: (_cfg, ctx) => ctx.forkBrakeMount !== 'none'
      },
      {
        id: 'caliper-rear',
        t: 'Rear brake',
        visible: (_cfg, ctx) => ctx.frameBrakeMount !== 'none'
      },
      {
        id: 'lever-left',
        t: (cfg) => (cfg.bar === 'drop' ? 'Left lever / brifter' : 'Left brake lever'),
        visible: (_cfg, ctx) => !(ctx.forkBrakeMount === 'none' && ctx.frameBrakeMount === 'none')
      },
      {
        id: 'lever-right',
        t: (cfg) => (cfg.bar === 'drop' ? 'Right lever / brifter' : 'Right brake lever'),
        visible: (_cfg, ctx) => !(ctx.forkBrakeMount === 'none' && ctx.frameBrakeMount === 'none')
      }
    ]
  },
  {
    id: 'wheels',
    title: 'Wheels',
    items: [
      {
        id: 'front-wheel',
        t: 'Front wheel',
        n: 'Brake type follows the fork; link a fork to narrow to rim- or disc-brake wheels.'
      },
      {
        id: 'rear-wheel',
        t: 'Rear wheel',
        n: (cfg) =>
          cfg.rear_speeds === '1'
            ? 'Single-speed / track / flip-flop rear hub.'
            : 'Incompatible-freehub wheels you own are shown in a separate group, not hidden.'
      }
    ]
  }
];

// ---------------------------------------------------------------------------
// Logic helpers (ported / equivalent to the original artifact)
// ---------------------------------------------------------------------------

export function itemKey(sectionId: string, itemId: string): string {
  return `${sectionId}::${itemId}`;
}

/** Resolve a "<sectionId>::<itemId>" key back to its section + item. */
export function findItem(key: string): { section: ChecklistSection; item: ChecklistItem } | null {
  const [sid, iid] = key.split('::');
  const section = SECTIONS.find((s) => s.id === sid);
  const item = section?.items.find((i) => i.id === iid);
  return section && item ? { section, item } : null;
}

export function itemVisible(
  item: ChecklistItem,
  cfg: ChecklistConfig,
  ctx: ChecklistContext = {}
): boolean {
  return item.visible ? item.visible(cfg, ctx) : true;
}

function resolveDyn<T>(value: Dyn<T> | undefined, cfg: ChecklistConfig): T | undefined {
  if (value == null) return undefined;
  return typeof value === 'function' ? (value as (c: ChecklistConfig) => T)(cfg) : value;
}

export function getTitle(item: ChecklistItem, cfg: ChecklistConfig): string {
  return resolveDyn(item.t, cfg) ?? item.id;
}

export function getDynamicNote(item: ChecklistItem, cfg: ChecklistConfig): string | undefined {
  return resolveDyn(item.n, cfg);
}

/** Build subtitle from config (§9.3): "2×10 mechanical drivetrain", etc. */
export function buildSubtitle(cfg: ChecklistConfig): string {
  if (cfg.rear_speeds === '1') {
    if (cfg.tension === 'ebb') return 'single-speed (eccentric BB)';
    if (cfg.tension === 'tensioner') return 'single-speed (chain tensioner)';
    return 'single-speed';
  }
  return `${cfg.chainrings}×${cfg.rear_speeds} mechanical drivetrain`;
}

/**
 * Unusual-combination warnings (§9.3) — shown, never blocked.
 * 3×11/12, 2×12, 3×1, 1×1 (treated as fixed/single-speed).
 */
export function getConfigWarnings(cfg: ChecklistConfig): string[] {
  const warnings: string[] = [];
  const cr = cfg.chainrings;
  const rs = cfg.rear_speeds;

  if (cr === '3' && (rs === '11' || rs === '12')) {
    warnings.push(`3×${rs} is unusual — front-shift quality and chainline can suffer at this width.`);
  }
  if (cr === '2' && rs === '12') {
    warnings.push('2×12 is uncommon — verify your shifters and front derailleur support it.');
  }
  if (cr === '3' && rs === '1') {
    warnings.push(
      '3×1 is unusual — with a single rear cog use the tension axis (tensioner or eccentric BB) for vertical dropouts.'
    );
  }
  if (cr === '1' && rs === '1') {
    warnings.push('1×1 is treated as fixed/single-speed — no derailleurs are required.');
  }
  return warnings;
}

/** Flatten all currently-visible item keys for a config (progress denominator). */
export function visibleItemKeys(cfg: ChecklistConfig, ctx: ChecklistContext = {}): string[] {
  const keys: string[] = [];
  for (const section of SECTIONS) {
    for (const item of section.items) {
      if (itemVisible(item, cfg, ctx)) keys.push(itemKey(section.id, item.id));
    }
  }
  return keys;
}
