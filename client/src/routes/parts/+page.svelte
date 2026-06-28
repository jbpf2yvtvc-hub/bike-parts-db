<script lang="ts">
  import PartCard from '$lib/components/PartCard.svelte';
  import { DISPOSITIONS } from '$lib/types';
  import { Plus } from '@lucide/svelte';
  let { data } = $props();
</script>

<svelte:head><title>Parts · Bike Parts DB</title></svelte:head>

<div class="mb-4 flex items-center justify-between">
  <h1 class="font-display text-3xl tracking-wide text-accent">Parts</h1>
  <a href="/parts/new" class="btn btn-primary" aria-keyshortcuts="c p">
    <Plus size={18} aria-hidden="true" /> Add
  </a>
</div>

<!-- Filter via GET form so it works with no JS. -->
<form method="GET" class="mb-6 flex flex-wrap gap-3">
  <div>
    <label for="type" class="block text-sm text-ink-muted">Type</label>
    <select id="type" name="type" class="mt-1 min-h-[44px] rounded-md border border-border bg-surface-2 px-3 py-2">
      <option value="">All types</option>
      {#each data.schemas as s (s.type_id)}
        <option value={s.type_id} selected={data.typeFilter === s.type_id}>{s.label}</option>
      {/each}
    </select>
  </div>
  <div>
    <label for="disposition" class="block text-sm text-ink-muted">Disposition</label>
    <select id="disposition" name="disposition" class="mt-1 min-h-[44px] rounded-md border border-border bg-surface-2 px-3 py-2">
      <option value="">Any</option>
      {#each DISPOSITIONS as d (d.value)}
        <option value={d.value} selected={data.disposition === d.value}>{d.label}</option>
      {/each}
    </select>
  </div>
  <div class="flex items-end">
    <button type="submit" class="btn btn-secondary">Filter</button>
  </div>
</form>

{#if data.parts.length}
  <div class="grid gap-3 sm:grid-cols-2">
    {#each data.parts as part (part.id)}
      <PartCard {part} />
    {/each}
  </div>
{:else}
  <p class="text-ink-muted">No parts match. <a href="/parts/new" class="text-accent underline">Add one</a>.</p>
{/if}
