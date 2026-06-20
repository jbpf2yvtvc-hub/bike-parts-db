<script lang="ts">
  import { CircleCheck, Tag, Gift, CircleHelp } from '@lucide/svelte';
  import type { Disposition } from '$lib/types';

  let { disposition }: { disposition: Disposition } = $props();

  // Meaning conveyed by icon + text + color, never color alone (§3).
  const META: Record<Disposition, { label: string; icon: any; cls: string }> = {
    keep: { label: 'Keep', icon: CircleCheck, cls: 'text-keep border-keep/40' },
    for_sale: { label: 'For sale', icon: Tag, cls: 'text-for-sale border-for-sale/40' },
    donate: { label: 'Donate', icon: Gift, cls: 'text-donate border-donate/40' },
    unknown: { label: 'Unknown', icon: CircleHelp, cls: 'text-unknown border-unknown/40' }
  };

  const meta = $derived(META[disposition] ?? META.unknown);
</script>

<span
  class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium {meta.cls}"
>
  <meta.icon size={14} aria-hidden="true" />
  {meta.label}
</span>
