<script lang="ts">
  import DispositionBadge from './DispositionBadge.svelte';
  import { getLabel } from '$lib/schema-utils';
  import { MapPin } from '@lucide/svelte';
  import type { PartRecord } from '$lib/types';

  let { part }: { part: PartRecord } = $props();

  const title = $derived(
    [part.attributes?.brand, part.attributes?.model].filter(Boolean).join(' ') ||
      getLabel(part.type_id)
  );
  const qty = $derived(part.quantity ?? 1);
  const bikeNames = $derived((part.expand?.bikes ?? []).map((b) => b.name));
</script>

<a
  href={`/parts/${part.id}`}
  class="block rounded-lg border border-border bg-surface p-4 hover:border-accent"
>
  <div class="flex items-start justify-between gap-2">
    <div>
      <p class="text-xs uppercase tracking-wide text-ink-muted">{getLabel(part.type_id)}</p>
      <h3 class="font-condensed text-lg font-semibold text-ink">
        {title}{#if qty > 1}<span class="ml-1 text-sm font-normal text-ink-muted">×{qty}</span>{/if}
      </h3>
    </div>
    <DispositionBadge disposition={part.disposition} />
  </div>
  {#if bikeNames.length}
    <p class="mt-2 flex items-center gap-1 text-sm text-ink-muted">
      <MapPin size={14} aria-hidden="true" /> On: {bikeNames.join(', ')}
    </p>
  {/if}
</a>
