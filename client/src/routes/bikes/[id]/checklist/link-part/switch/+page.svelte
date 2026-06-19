<script lang="ts">
  import { ArrowLeftRight, TriangleAlert } from '@lucide/svelte';
  let { data } = $props();
  const backHref = $derived(
    `/bikes/${data.bikeId}/checklist/link-part?item=${encodeURIComponent(data.item)}`
  );
</script>

<svelte:head><title>Switch part to {data.bikeName}? · Bike Parts DB</title></svelte:head>

<div class="mx-auto max-w-lg rounded-lg border border-accent/40 bg-surface p-6">
  <h1 class="flex items-center gap-2 font-condensed text-2xl font-bold">
    <TriangleAlert size={24} class="text-for-sale" aria-hidden="true" />
    Switch this part to {data.bikeName}?
  </h1>
  <p class="mt-3 text-ink-muted">
    <strong class="text-ink">{data.partTitle}</strong> has no free units left — every one is already
    on a bike. Switching moves one onto <strong class="text-ink">{data.bikeName}</strong>.
  </p>

  <form method="POST" action={`/bikes/${data.bikeId}/checklist/link-part?/linkPart`} class="mt-4">
    <input type="hidden" name="item" value={data.item} />
    <input type="hidden" name="partId" value={data.partId} />
    <input type="hidden" name="confirm" value="1" />

    {#if data.otherBikes.length > 1}
      <fieldset class="mb-4">
        <legend class="mb-1 font-medium">Take it off which bike?</legend>
        {#each data.otherBikes as b, i (b.id)}
          <label class="flex min-h-[44px] items-center gap-2">
            <input type="radio" name="from" value={b.id} checked={i === 0} class="h-4 w-4" />
            <span>{b.name}</span>
          </label>
        {/each}
      </fieldset>
    {:else}
      <input type="hidden" name="from" value={data.otherBikes[0]?.id} />
      <p class="mb-4 text-ink-muted">It will be removed from {data.otherBikes[0]?.name}.</p>
    {/if}

    <div class="flex justify-end gap-3">
      <a href={backHref} class="btn min-h-[44px] rounded-md border border-border px-4 py-2 font-medium">Cancel</a>
      <button type="submit" class="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-accent px-4 py-2 font-semibold text-accent-ink">
        <ArrowLeftRight size={18} aria-hidden="true" /> Switch
      </button>
    </div>
  </form>
</div>
