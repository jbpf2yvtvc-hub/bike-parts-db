<script lang="ts">
  import { contrastRatio } from './system';

  // The chip fills from the *live* CSS variable (var(--color-<name>)), so the
  // visual is always the real token even if the hex label below drifts.
  let { name, hex, role }: { name: string; hex: string; role: string } = $props();

  // Contrast vs the two backgrounds these colors are used on.
  const onGround = $derived(contrastRatio(hex, '#0e0e0e'));
  const onSurface = $derived(contrastRatio(hex, '#1a1a1a'));
  const passes = (r: number) => (r >= 4.5 ? 'AA' : r >= 3 ? 'AA Large' : 'fail');
</script>

<div class="flex items-center gap-3 rounded-md border border-border bg-surface-2 p-3">
  <span
    class="h-12 w-12 shrink-0 rounded-md border border-border"
    style="background: var(--color-{name})"
    aria-hidden="true"
  ></span>
  <div class="min-w-0">
    <p class="font-mono text-sm text-ink">--color-{name}</p>
    <p class="font-mono text-xs text-ink-muted">{hex}</p>
    <p class="mt-0.5 text-sm text-ink-muted">{role}</p>
    <p class="mt-1 text-xs text-ink-muted">
      on ground <span class="text-ink">{onGround}:1</span> ({passes(onGround)}) ·
      on surface <span class="text-ink">{onSurface}:1</span> ({passes(onSurface)})
    </p>
  </div>
</div>
