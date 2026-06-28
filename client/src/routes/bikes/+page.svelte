<script lang="ts">
  import BikeCard from '$lib/components/BikeCard.svelte';
  import { Plus } from '@lucide/svelte';
  let { data } = $props();
</script>

<svelte:head><title>Bikes · Bike Parts DB</title></svelte:head>

<div class="mb-6 flex items-center justify-between">
  <h1 class="font-display text-3xl tracking-wide text-accent">Bikes</h1>
  <a href="/bikes/new" class="btn btn-primary" aria-keyshortcuts="c b">
    <Plus size={18} aria-hidden="true" /> Add
  </a>
</div>

{#if data.bikes.length}
  <div class="grid gap-3 sm:grid-cols-2">
    {#each data.bikes as bike (bike.id)}
      <BikeCard {bike} />
    {/each}
  </div>
{:else}
  <p class="text-ink-muted">No bikes yet. <a href="/bikes/new" class="text-accent underline">Add one</a>.</p>
{/if}
