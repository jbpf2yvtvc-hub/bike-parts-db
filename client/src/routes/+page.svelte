<script lang="ts">
  import PartCard from '$lib/components/PartCard.svelte';
  import BikeCard from '$lib/components/BikeCard.svelte';
  import { Plus, Boxes, Bike } from '@lucide/svelte';
  let { data } = $props();
</script>

<svelte:head><title>Home · Bike Parts DB</title></svelte:head>

<h1 class="mb-1 font-display text-3xl tracking-wide text-accent">Hi, {data.displayName}</h1>
<p class="mb-6 text-ink-muted">Your inventory at a glance.</p>

<div class="mb-8 grid grid-cols-2 gap-3">
  <a href="/parts" class="rounded-lg border border-border bg-surface p-4">
    <Boxes size={20} class="text-accent" aria-hidden="true" />
    <p class="mt-2 font-condensed text-3xl">{data.partsTotal}</p>
    <p class="text-sm text-ink-muted">Parts</p>
  </a>
  <a href="/bikes" class="rounded-lg border border-border bg-surface p-4">
    <Bike size={20} class="text-accent" aria-hidden="true" />
    <p class="mt-2 font-condensed text-3xl">{data.bikesTotal}</p>
    <p class="text-sm text-ink-muted">Bikes</p>
  </a>
</div>

<div class="mb-4 flex gap-3">
  <a href="/parts/new" class="btn btn-primary">
    <Plus size={18} aria-hidden="true" /> Add part
  </a>
  <a href="/bikes/new" class="btn btn-secondary">
    <Plus size={18} aria-hidden="true" /> Add bike
  </a>
</div>

{#if data.recentParts.length}
  <section class="mt-8">
    <h2 class="mb-3 font-condensed text-xl font-semibold">Recent parts</h2>
    <div class="grid gap-3 sm:grid-cols-2">
      {#each data.recentParts as part (part.id)}
        <PartCard {part} />
      {/each}
    </div>
  </section>
{/if}

{#if data.recentBikes.length}
  <section class="mt-8">
    <h2 class="mb-3 font-condensed text-xl font-semibold">Your bikes</h2>
    <div class="grid gap-3 sm:grid-cols-2">
      {#each data.recentBikes as bike (bike.id)}
        <BikeCard {bike} />
      {/each}
    </div>
  </section>
{/if}

{#if !data.recentParts.length && !data.recentBikes.length}
  <p class="mt-8 text-ink-muted">Nothing here yet. Start by adding a part or a bike.</p>
{/if}
