/**
 * Design-system data — the *formalized* token system extrapolated from the
 * live app. These values mirror the `@theme` block in `src/app.css` (the
 * runtime source of truth); the swatches on the Foundations page render from
 * the real CSS variables, so visuals can't drift even if a hex label here lags.
 *
 * This module lives under the `/design` route (not `$lib`) on purpose: it is
 * documentation data, not app code.
 */

export interface ColorToken {
  /** token name (also the Tailwind/CSS suffix, e.g. `ground` -> `--color-ground`) */
  name: string;
  hex: string;
  role: string;
}

export interface ColorGroup {
  name: string;
  note?: string;
  tokens: ColorToken[];
}

export const colorGroups: ColorGroup[] = [
  {
    name: 'Surfaces & elevation',
    note: 'Elevation is expressed by stepping the surface lighter, not by shadow. ground < surface < surface-2, separated by a hairline border.',
    tokens: [
      { name: 'ground', hex: '#0e0e0e', role: 'App background — lowest elevation' },
      { name: 'surface', hex: '#1a1a1a', role: 'Cards, nav bars (elevation 1)' },
      { name: 'surface-2', hex: '#242424', role: 'Inputs and insets within a card (elevation 2)' },
      { name: 'border', hex: '#3a3a3a', role: 'Hairline borders and dividers' },
    ],
  },
  {
    name: 'Text (ink)',
    tokens: [
      { name: 'ink', hex: '#f5f5f5', role: 'Primary text' },
      { name: 'ink-muted', hex: '#c2c2c2', role: 'Secondary text, hints, captions' },
    ],
  },
  {
    name: 'Brand',
    tokens: [
      { name: 'accent', hex: '#f5c800', role: 'Brand yellow — emphasis, active nav, focus ring' },
      { name: 'accent-ink', hex: '#0e0e0e', role: 'Text/icons placed on an accent fill' },
    ],
  },
  {
    name: 'Disposition (status)',
    note: 'Status is always conveyed by icon + text + color, never color alone (WCAG SC 1.4.1).',
    tokens: [
      { name: 'keep', hex: '#4ade80', role: '“Keep” — green' },
      { name: 'for-sale', hex: '#f59e0b', role: '“For sale” — amber, distinct from the brand accent' },
      { name: 'donate', hex: '#60a5fa', role: '“Donate” — blue' },
      { name: 'unknown', hex: '#94a3b8', role: '“Unknown” — slate, distinct from ink-muted' },
    ],
  },
  {
    name: 'Danger / destructive',
    note: 'One semantic source for errors and destructive UI. Replaces the ad-hoc red-400/500/600 that used to be inline across components.',
    tokens: [
      { name: 'danger', hex: '#dc2626', role: 'Destructive button fill (white label passes AA)' },
      { name: 'danger-ink', hex: '#ffffff', role: 'Text/icon on a danger fill' },
      { name: 'danger-fg', hex: '#f87171', role: 'Danger as text/icon/border on dark surfaces' },
    ],
  },
];

export interface ButtonVariant {
  cls: string;
  label: string;
  usage: string;
}

export const buttonVariants: ButtonVariant[] = [
  { cls: 'btn btn-primary', label: 'Primary', usage: 'The single main action on a view (Save, Add).' },
  { cls: 'btn btn-secondary', label: 'Secondary', usage: 'Neutral actions (Cancel, Edit, Filter, Export).' },
  { cls: 'btn btn-danger', label: 'Danger', usage: 'Confirmed destructive action (Delete).' },
  { cls: 'btn btn-danger-outline', label: 'Danger outline', usage: 'Destructive trigger before confirmation.' },
];

export interface TypeStep {
  name: string;
  usage: string;
  /** Tailwind classes that reproduce the step */
  cls: string;
  spec: string;
}

export const typeScale: TypeStep[] = [
  { name: 'Display', usage: 'Brand mark', cls: 'font-display text-2xl font-semibold uppercase tracking-wide', spec: 'Montserrat · 1.5rem/24px · 600 · UPPERCASE · +0.03em' },
  { name: 'Heading 1', usage: 'Page titles', cls: 'font-display text-2xl font-semibold uppercase', spec: 'Montserrat · 1.5rem/24px · 600 · UPPERCASE' },
  { name: 'Heading 2', usage: 'Section titles', cls: 'font-display text-xl font-semibold uppercase', spec: 'Montserrat · 1.25rem/20px · 600 · UPPERCASE' },
  { name: 'Heading 3', usage: 'Card titles', cls: 'font-condensed text-lg font-semibold uppercase', spec: 'Montserrat · 1.125rem/18px · 600 · UPPERCASE' },
  { name: 'Body', usage: 'Default copy', cls: 'text-base', spec: 'system-ui · 1rem/16px · 400' },
  { name: 'Small', usage: 'Secondary copy, labels', cls: 'text-sm', spec: 'system-ui · 0.875rem/14px · 400' },
  { name: 'Caption', usage: 'Type labels, meta', cls: 'text-xs uppercase tracking-wide text-ink-muted', spec: 'system-ui · 0.75rem/12px · UPPERCASE' },
];

export interface ScaleStep {
  token: string;
  value: string;
  usage: string;
}

export const spacingScale: ScaleStep[] = [
  { token: '1', value: '0.25rem / 4px', usage: 'Icon ↔ label gaps, tight chips' },
  { token: '2', value: '0.5rem / 8px', usage: 'Inline gaps, badge padding' },
  { token: '3', value: '0.75rem / 12px', usage: 'Control inner padding (x)' },
  { token: '4', value: '1rem / 16px', usage: 'Card padding, field stacking' },
  { token: '6', value: '1.5rem / 24px', usage: 'Section separation' },
  { token: '8', value: '2rem / 32px', usage: 'Major blocks' },
];

export const radiusScale: ScaleStep[] = [
  { token: 'rounded-md', value: '0.375rem / 6px', usage: 'Inputs, buttons' },
  { token: 'rounded-lg', value: '0.5rem / 8px', usage: 'Cards, dialogs' },
  { token: 'rounded-full', value: '9999px', usage: 'Badges / pills' },
];

export interface IconUse {
  size: string;
  usage: string;
}

export const iconSizes: IconUse[] = [
  { size: '14', usage: 'Inline with text, badges' },
  { size: '16–20', usage: 'Buttons, side-nav items' },
  { size: '22', usage: 'Bottom-nav (primary touch)' },
];

export interface Recommendation {
  title: string;
  severity: 'high' | 'medium' | 'low';
  problem: string;
  suggestion: string;
  /** What was actually applied (these have all been implemented). */
  resolution: string;
}

export const recommendations: Recommendation[] = [
  {
    title: '“For sale” status reuses the brand accent',
    severity: 'medium',
    problem: '--color-for-sale (#f5c800) is identical to --color-accent. A for-sale badge reads as brand emphasis, and the two meanings collide anywhere they co-occur.',
    suggestion: 'Give for-sale a distinct hue — e.g. an amber/orange (#f59e0b) — that is clearly not the brand yellow while still meeting AA. Keep the Tag icon + label so meaning never rests on color.',
    resolution: 'Applied — --color-for-sale is now amber #f59e0b (8.1:1 on surface), clearly distinct from the brand accent.',
  },
  {
    title: '“Unknown” status is indistinguishable from muted text',
    severity: 'medium',
    problem: '--color-unknown (#c2c2c2) equals --color-ink-muted, so an Unknown badge looks like ordinary secondary text rather than a state.',
    suggestion: 'Use a distinct neutral with a hint of hue (e.g. slate #94a3b8) for unknown, or lean harder on the outlined pill treatment so it reads as a status chip.',
    resolution: 'Applied — --color-unknown is now slate #94a3b8, distinct from ink-muted.',
  },
  {
    title: 'No semantic “danger” token',
    severity: 'low',
    problem: 'Destructive UI hard-codes red-400/red-500/red-600 inline (DeleteConfirm, FormField errors, BikeForm). The danger color is undocumented and can drift.',
    suggestion: 'Add --color-danger / --color-danger-ink to @theme and reference them, so error text, destructive buttons, and invalid borders share one source.',
    resolution: 'Applied — added --color-danger, --color-danger-ink, and --color-danger-fg; FormField, the confirm dialogs, both forms, and all pages now reference them.',
  },
  {
    title: 'Button styling is duplicated across components',
    severity: 'medium',
    problem: 'The same `min-h-[44px] rounded-md px-4 py-2 …` button recipe is repeated inline in DeleteConfirm, SwitchConfirm, the forms, and pages. Variants (primary/secondary/destructive) aren’t centralized.',
    suggestion: 'Extract a Button component (or `btn`/`btn-primary`/`btn-danger` classes) capturing the variants + the shared 44px target and focus affordance already in app.css.',
    resolution: 'Applied — added .btn-primary / .btn-secondary / .btn-danger / .btn-danger-outline in app.css; every component and page button now uses them.',
  },
  {
    title: 'Spacing, type, and radius are used ad hoc',
    severity: 'low',
    problem: 'Components reach for Tailwind defaults directly (p-4, text-lg, rounded-lg) with no documented scale, so rhythm is by convention, not contract.',
    suggestion: 'Adopt the named scales now documented in Foundations as the canonical set and keep new UI on them; consider lint rules to flag off-scale values.',
    resolution: 'Adopted — Foundations is now the system of record for the color/type/spacing/radius scales, and the new button classes are built on them. (A lint rule to flag off-scale values remains optional future work.)',
  },
  {
    title: 'All-caps headings reduce legibility at length',
    severity: 'low',
    problem: 'Every h1–h6 is forced UPPERCASE globally. Short labels read fine, but longer content headings (e.g. user part/bike names if ever promoted to headings) are harder to scan in all-caps.',
    suggestion: 'Keep all-caps for chrome/section headers; allow a sentence-case heading variant for long, user-generated strings.',
    resolution: 'Applied — added the .heading-cased opt-out and applied it to part/bike names (cards + detail titles); chrome and section headers stay all-caps.',
  },
];

/** WCAG relative-luminance contrast ratio between two #rrggbb colors. */
export function contrastRatio(hexA: string, hexB: string): number {
  const lum = (hex: string) => {
    const m = hex.replace('#', '');
    const ch = [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16) / 255);
    const lin = ch.map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  };
  const a = lum(hexA);
  const b = lum(hexB);
  const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  return Math.round(ratio * 100) / 100;
}
