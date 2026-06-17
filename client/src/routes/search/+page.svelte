<script lang="ts">
  import PartCard from '$lib/components/PartCard.svelte';
  import { goto } from '$app/navigation';
  import { Search } from '@lucide/svelte';
  import { untrack } from 'svelte';
  let { data } = $props();

  let value = $state(untrack(() => data.q));
  let timer: ReturnType<typeof setTimeout> | undefined;

  // Enhancement: debounced in-place update via client-side nav, which re-runs
  // the server load. Degrades to the GET form below when JS is off.
  function onInput() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const params = value ? `?q=${encodeURIComponent(value)}` : '';
      goto(`/search${params}`, { keepFocus: true, noScroll: true, replaceState: true });
    }, 300);
  }
</script>

<svelte:head><title>Search · Bike Parts DB</title></svelte:head>

<h1 class="mb-4 font-display text-3xl tracking-wide text-accent">Search</h1>

<form method="GET" role="search" class="mb-6 flex gap-2">
  <label for="q" class="sr-only">Search parts</label>
  <input
    id="q"
    name="q"
    type="search"
    bind:value
    oninput={onInput}
    placeholder="Search by brand, model, attribute…"
    autocomplete="off"
    class="block w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 py-2"
  />
  <button type="submit" class="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-accent px-4 py-2 font-semibold text-accent-ink">
    <Search size={18} aria-hidden="true" /> Search
  </button>
</form>

<!-- Announce result counts without moving focus (SC 4.1.3). -->
<p role="status" aria-live="polite" class="mb-4 text-sm text-ink-muted">
  {#if data.q}{data.results.length} result{data.results.length === 1 ? '' : 's'} for “{data.q}”{/if}
</p>

{#if data.results.length}
  <div class="grid gap-3 sm:grid-cols-2">
    {#each data.results as part (part.id)}
      <PartCard {part} />
    {/each}
  </div>
{:else if data.q}
  <p class="text-ink-muted">No parts match “{data.q}”.</p>
{/if}
