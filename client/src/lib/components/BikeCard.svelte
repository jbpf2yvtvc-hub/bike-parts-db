<script lang="ts">
  import { CircleDot } from '@lucide/svelte';
  import type { BikeRecord } from '$lib/types';

  let { bike }: { bike: BikeRecord } = $props();

  const subtitle = $derived(
    [bike.make, bike.model, bike.year].filter(Boolean).join(' ')
  );
</script>

<a
  href={`/bikes/${bike.id}`}
  class="block rounded-lg border border-border bg-surface p-4 hover:border-accent"
>
  <div class="flex items-start justify-between gap-2">
    <div>
      <h3 class="font-condensed text-lg font-semibold text-ink">{bike.name}</h3>
      {#if subtitle}<p class="text-sm text-ink-muted">{subtitle}</p>{/if}
    </div>
    {#if bike.is_active}
      <span class="inline-flex items-center gap-1 rounded-full border border-keep/40 px-2 py-0.5 text-xs font-medium text-keep">
        <CircleDot size={14} aria-hidden="true" /> Active
      </span>
    {/if}
  </div>
</a>
