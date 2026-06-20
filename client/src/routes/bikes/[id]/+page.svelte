<script lang="ts">
  import PartCard from '$lib/components/PartCard.svelte';
  import DeleteConfirm from '$lib/components/DeleteConfirm.svelte';
  import { Pencil, ListChecks, CircleDot } from '@lucide/svelte';
  let { data } = $props();
  const bike = $derived(data.bike);
  const subtitle = $derived([bike.make, bike.model, bike.year].filter(Boolean).join(' '));
</script>

<svelte:head><title>{bike.name} · Bike Parts DB</title></svelte:head>

<nav class="mb-4 text-sm text-ink-muted"><a href="/bikes" class="text-accent underline">Bikes</a> / {bike.name}</nav>

<div class="mb-2 flex items-start justify-between gap-3">
  <div>
    <h1 class="font-condensed text-2xl font-bold">{bike.name}</h1>
    {#if subtitle}<p class="text-ink-muted">{subtitle}</p>{/if}
  </div>
  {#if bike.is_active}
    <span class="inline-flex items-center gap-1 rounded-full border border-keep/40 px-2 py-0.5 text-xs font-medium text-keep">
      <CircleDot size={14} aria-hidden="true" /> Active
    </span>
  {/if}
</div>

{#if bike.color}<p class="text-ink-muted">Color: {bike.color}</p>{/if}
{#if bike.notes}<p class="mt-2 whitespace-pre-line">{bike.notes}</p>{/if}

<div class="mt-6 flex flex-wrap gap-3">
  <a href={`/bikes/${bike.id}/checklist`} class="btn inline-flex min-h-[44px] items-center gap-2 rounded-md bg-accent px-4 py-2 font-semibold text-accent-ink">
    <ListChecks size={18} aria-hidden="true" /> Build checklist
  </a>
  <a href={`/bikes/${bike.id}/edit`} class="btn inline-flex min-h-[44px] items-center gap-2 rounded-md border border-border px-4 py-2 font-medium">
    <Pencil size={18} aria-hidden="true" /> Edit
  </a>
  <DeleteConfirm
    confirmHref={`/bikes/${bike.id}/confirm-delete`}
    action={`/bikes/${bike.id}?/delete`}
    label="Delete bike"
    title="Delete this bike?"
    message="Parts currently on this bike will NOT be deleted — they will be detached and remain in your inventory. The bike’s checklist progress will be removed. This cannot be undone."
  />
</div>

<section class="mt-8" aria-labelledby="on-bike">
  <h2 id="on-bike" class="mb-3 font-condensed text-xl font-semibold">Parts on this bike ({data.parts.length})</h2>
  {#if data.parts.length}
    <div class="grid gap-3 sm:grid-cols-2">
      {#each data.parts as part (part.id)}
        <PartCard {part} />
      {/each}
    </div>
  {:else}
    <p class="text-ink-muted">No parts are assigned to this bike yet.</p>
  {/if}
</section>
