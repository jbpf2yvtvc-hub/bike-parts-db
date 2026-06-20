<script lang="ts">
  import Swatch from '../_lib/Swatch.svelte';
  import { colorGroups, typeScale, spacingScale, radiusScale, iconSizes } from '../_lib/system';
  import { Boxes, Bike, Tag, ArrowLeftRight } from '@lucide/svelte';

  const spacingPx: Record<string, string> = {
    '1': '4px', '2': '8px', '3': '12px', '4': '16px', '6': '24px', '8': '32px'
  };
</script>

<!-- COLOR ------------------------------------------------------------------>
<section class="mb-12">
  <h2 class="mb-1 font-display text-xl font-semibold text-ink">Color</h2>
  <p class="mb-4 text-sm text-ink-muted">
    Named by role, not hue. Each chip fills from its live CSS variable; ratios are computed against
    the backgrounds the token is actually used on (AA = 4.5:1 text, 3:1 large/UI).
  </p>
  {#each colorGroups as group (group.name)}
    <h3 class="mb-2 mt-6 font-condensed text-lg font-semibold text-ink">{group.name}</h3>
    {#if group.note}<p class="mb-3 text-sm text-ink-muted">{group.note}</p>{/if}
    <div class="grid gap-3 sm:grid-cols-2">
      {#each group.tokens as t (t.name)}
        <Swatch name={t.name} hex={t.hex} role={t.role} />
      {/each}
    </div>
  {/each}
</section>

<!-- TYPOGRAPHY -------------------------------------------------------------->
<section class="mb-12">
  <h2 class="mb-1 font-display text-xl font-semibold text-ink">Typography</h2>
  <p class="mb-4 text-sm text-ink-muted">
    Headings use <strong class="text-ink">Montserrat</strong> (geometric, all-caps, +0.03em),
    degrading to system-ui. Body copy is the native <strong class="text-ink">system-ui</strong> stack.
  </p>
  <div class="divide-y divide-border rounded-lg border border-border bg-surface">
    {#each typeScale as step (step.name)}
      <div class="flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline sm:justify-between">
        <span class={step.cls}>{step.name}</span>
        <span class="text-xs text-ink-muted normal-case">{step.usage} · {step.spec}</span>
      </div>
    {/each}
  </div>
  <div class="mt-4 rounded-lg border border-border bg-surface p-4">
    <p class="mb-2 text-sm text-ink-muted">
      <code class="text-ink">.heading-cased</code> opts a heading out of all-caps for long,
      user-generated strings (part/bike names) while keeping the display face. Chrome and section
      headers stay uppercase.
    </p>
    <p class="font-condensed text-lg font-semibold text-ink">Default heading (Shimano Deore Xt)</p>
    <p class="font-condensed text-lg font-semibold text-ink heading-cased">.heading-cased (Shimano Deore XT)</p>
  </div>
</section>

<!-- SPACING ----------------------------------------------------------------->
<section class="mb-12">
  <h2 class="mb-1 font-display text-xl font-semibold text-ink">Spacing</h2>
  <p class="mb-4 text-sm text-ink-muted">A 4px base scale. Stay on these steps for consistent rhythm.</p>
  <div class="space-y-2">
    {#each spacingScale as s (s.token)}
      <div class="flex items-center gap-4">
        <span class="w-28 shrink-0 font-mono text-sm text-ink">{s.token} · {spacingPx[s.token]}</span>
        <span class="h-4 rounded-sm bg-accent" style="width: {spacingPx[s.token]}" aria-hidden="true"></span>
        <span class="text-sm text-ink-muted">{s.usage}</span>
      </div>
    {/each}
  </div>
</section>

<!-- RADIUS & ELEVATION ------------------------------------------------------>
<section class="mb-12 grid gap-8 sm:grid-cols-2">
  <div>
    <h2 class="mb-1 font-display text-xl font-semibold text-ink">Radius</h2>
    <p class="mb-4 text-sm text-ink-muted">Three steps cover every surface.</p>
    <div class="space-y-3">
      {#each radiusScale as r (r.token)}
        <div class="flex items-center gap-3">
          <span class="h-12 w-12 shrink-0 border border-accent/60 bg-surface-2 {r.token}" aria-hidden="true"></span>
          <div>
            <p class="font-mono text-sm text-ink">{r.token}</p>
            <p class="text-xs text-ink-muted">{r.value} · {r.usage}</p>
          </div>
        </div>
      {/each}
    </div>
  </div>
  <div>
    <h2 class="mb-1 font-display text-xl font-semibold text-ink">Elevation</h2>
    <p class="mb-4 text-sm text-ink-muted">Depth by lighter surface + border, not shadow.</p>
    <div class="rounded-lg border border-border bg-ground p-3">
      <p class="mb-2 text-xs text-ink-muted">ground</p>
      <div class="rounded-lg border border-border bg-surface p-3">
        <p class="mb-2 text-xs text-ink-muted">surface (card)</p>
        <div class="rounded-md border border-border bg-surface-2 p-3">
          <p class="text-xs text-ink-muted">surface-2 (input/inset)</p>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- FOCUS & MOTION ---------------------------------------------------------->
<section class="mb-12 grid gap-8 sm:grid-cols-2">
  <div>
    <h2 class="mb-1 font-display text-xl font-semibold text-ink">Focus</h2>
    <p class="mb-4 text-sm text-ink-muted">
      A 3px accent outline (offset 2px) on <code class="text-ink">:focus-visible</code>, never removed.
      Tab to the button to see it.
    </p>
    <button class="min-h-[44px] rounded-md border border-border bg-surface-2 px-4 py-2 text-ink">
      Focusable button
    </button>
  </div>
  <div>
    <h2 class="mb-1 font-display text-xl font-semibold text-ink">Motion</h2>
    <p class="text-sm text-ink-muted">
      Transitions are 120ms (filter/color/border). The same brightness change applies on hover
      <em>and</em> keyboard focus. All motion is disabled under
      <code class="text-ink">prefers-reduced-motion</code>.
    </p>
  </div>
</section>

<!-- ICONOGRAPHY ------------------------------------------------------------->
<section>
  <h2 class="mb-1 font-display text-xl font-semibold text-ink">Iconography</h2>
  <p class="mb-4 text-sm text-ink-muted">
    <strong class="text-ink">Lucide</strong> (inline SVG, no external requests). Decorative icons get
    <code class="text-ink">aria-hidden</code>; meaning is always also in text.
  </p>
  <div class="mb-4 flex flex-wrap gap-4 text-ink">
    <Boxes aria-hidden="true" /><Bike aria-hidden="true" /><Tag aria-hidden="true" />
    <ArrowLeftRight aria-hidden="true" />
  </div>
  <ul class="space-y-1 text-sm text-ink-muted">
    {#each iconSizes as i (i.size)}
      <li><span class="font-mono text-ink">{i.size}px</span> — {i.usage}</li>
    {/each}
  </ul>
</section>
