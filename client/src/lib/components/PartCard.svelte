<script lang="ts">
  import DispositionBadge from './DispositionBadge.svelte';
  import { getLabel, partTitle } from '$lib/schema-utils';
  import { MapPin } from '@lucide/svelte';
  import type { PartRecord } from '$lib/types';

  let { part }: { part: PartRecord } = $props();

  const title = $derived(partTitle(part));
  const qty = $derived(part.quantity ?? 1);
  const bikeNames = $derived((part.expand?.bikes ?? []).map((b) => b.name));
  // A short distinguisher in the type line so otherwise-identical parts are
  // easy to tell apart: front/rear for wheels & tires, spindle length for BBs.
  const distinguisher = $derived.by(() => {
    const a = part.attributes ?? {};
    if (part.type_id === 'wheel' || part.type_id === 'tire') return String(a.position ?? '');
    if (part.type_id === 'bottom_bracket' && a.spindle_length_mm != null && a.spindle_length_mm !== '')
      return `${a.spindle_length_mm}mm spindle`;
    return '';
  });

  // Per-type spec lines surfaced on the card so variants of the same model are
  // distinguishable at a glance (clarity over compactness — taller cards are OK).
  // Each entry is [attribute id, formatter]; empty values are dropped. `color`
  // is appended for every type below, so it is omitted from these lists.
  type Fmt = (v: unknown) => string;
  const specMap: Record<string, [string, Fmt][]> = {
    seatpost: [
      ['diameter_mm', (v) => `Ø${v}mm`],
      ['length_mm', (v) => `${v}mm`],
      ['setback_mm', (v) => `${v}mm setback`],
      ['dropper', (v) => (v ? 'dropper' : '')],
    ],
    stem: [
      ['length_mm', (v) => `${v}mm`],
      ['clamp_diameter', (v) => `${v} clamp`],
      ['angle_deg', (v) => `${v}°`],
    ],
    handlebar: [
      ['width_mm', (v) => `${v}mm`],
      ['clamp_diameter', (v) => `${v} clamp`],
      ['style', (v) => `${v}`],
    ],
    fork: [
      ['steerer', (v) => `${v}`],
      ['axle_standard', (v) => `${v}`],
      ['travel_mm', (v) => `${v}mm travel`],
    ],
    wheel: [
      ['wheel_size', (v) => `${v}`],
      ['brake_type', (v) => `${v}`],
      ['freehub_standard', (v) => `${v}`],
    ],
    tire: [
      ['size', (v) => `${v}`],
      ['casing', (v) => `${v}`],
    ],
    frame: [
      ['size', (v) => `${v}`],
      ['material', (v) => `${v}`],
    ],
    crankset: [
      ['arm_length_mm', (v) => `${v}mm arms`],
      ['chainring_teeth', (v) => `${v}T`],
    ],
    saddle: [
      ['width_mm', (v) => `${v}mm`],
      ['length_mm', (v) => `${v}mm`],
      ['rail_material', (v) => `${v} rails`],
    ],
    brake_caliper: [
      ['style', (v) => `${v}`],
      ['mount', (v) => `${v}`],
    ],
    brake_lever: [
      ['pull', (v) => `${v}-pull`],
      ['mount', (v) => `${v}`],
      ['hand', (v) => `${v}`],
    ],
    shifter: [
      ['speed', (v) => `${v}-spd`],
      ['hand', (v) => `${v}`],
      ['style', (v) => `${v}`],
    ],
    derailleur_rear: [
      ['speed', (v) => `${v}-spd`],
      ['cage_length', (v) => `${v} cage`],
      ['clutch', (v) => (v ? 'clutch' : '')],
    ],
    derailleur_front: [
      ['max_chainrings', (v) => `${v}× max`],
      ['mount', (v) => `${v}`],
    ],
    cassette: [
      ['speed', (v) => `${v}-spd`],
      ['range', (v) => `${v}`],
    ],
    chain: [
      ['speed', (v) => `${v}-spd`],
      ['links', (v) => `${v} links`],
    ],
    headset: [
      ['standard', (v) => `${v}`],
      ['stack_height_mm', (v) => `${v}mm stack`],
    ],
    bottom_bracket: [['shell_standard', (v) => `${v}`]],
    cog: [
      ['tooth_count', (v) => `${v}T`],
      ['style', (v) => `${v}`],
    ],
    chainring: [
      ['teeth', (v) => `${v}T`],
      ['bcd_mm', (v) => `${v}mm BCD`],
    ],
    spider: [
      ['arms', (v) => `${v}-arm`],
      ['bcd_mm', (v) => `${v}mm BCD`],
    ],
    seatpost_clamp: [
      ['diameter_mm', (v) => `Ø${v}mm`],
      ['closure', (v) => `${v}`],
    ],
    chain_tensioner: [
      ['mount', (v) => `${v}`],
      ['chain_width', (v) => `${v}`],
    ],
    eccentric_bb: [['shell_diameter', (v) => `${v}`]],
  };

  const specs = $derived.by(() => {
    const a = part.attributes ?? {};
    const empty = (v: unknown) => v === null || v === undefined || v === '';
    const out: string[] = [];
    for (const [id, fmt] of specMap[part.type_id] ?? []) {
      if (empty(a[id])) continue;
      const s = fmt(a[id]).trim();
      if (s) out.push(s);
    }
    // Color is optional on every part type; show it whenever the user set it.
    if (!empty(a.color)) out.push(String(a.color));
    return out;
  });
</script>

<a
  href={`/parts/${part.id}`}
  class="block rounded-lg border border-border bg-surface p-4 hover:border-accent"
>
  <div class="flex items-start justify-between gap-2">
    <div>
      <p class="text-xs uppercase tracking-wide text-ink-muted">
        {getLabel(part.type_id)}{#if distinguisher} · {distinguisher}{/if}
      </p>
      <h3 class="font-condensed text-lg font-semibold text-ink heading-cased">
        {title}{#if qty > 1}<span class="ml-1 text-sm font-normal text-ink-muted">×{qty}</span>{/if}
      </h3>
    </div>
    <DispositionBadge disposition={part.disposition} />
  </div>
  {#if specs.length}
    <p class="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-sm text-ink-muted">
      {#each specs as spec, i}
        <span>{spec}{#if i < specs.length - 1}<span aria-hidden="true" class="ml-2">·</span>{/if}</span>
      {/each}
    </p>
  {/if}
  {#if bikeNames.length}
    <p class="mt-2 flex items-center gap-1 text-sm text-ink-muted">
      <MapPin size={14} aria-hidden="true" /> On: {bikeNames.join(', ')}
    </p>
  {/if}
</a>
