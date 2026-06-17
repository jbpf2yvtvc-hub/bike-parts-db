<script lang="ts">
  import { getLabel } from '$lib/schema-utils';
  import { Plus, Check } from '@lucide/svelte';
  import { untrack } from 'svelte';
  let { data }: { data: any } = $props();

  const bikeId = untrack(() => data.bike.id);
  const backHref = `/bikes/${bikeId}/checklist`;
</script>

<svelte:head><title>Link a part · {data.itemTitle}</title></svelte:head>

<nav class="mb-3 text-sm text-ink-muted">
  <a href="/bikes" class="text-accent underline">Bikes</a> /
  <a href={`/bikes/${bikeId}`} class="text-accent underline">{data.bike.name}</a> /
  <a href={backHref} class="text-accent underline">Checklist</a> / Link
</nav>

<h1 class="mb-1 font-display text-3xl tracking-wide text-accent">Link a part</h1>
<p class="mb-6 font-condensed text-lg text-ink-muted">
  {data.itemTitle}{#if data.typeId} · {getLabel(data.typeId)}{/if}
</p>

{#snippet partRow(p: any)}
  <li class="rounded-lg border border-border bg-surface p-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-xs uppercase tracking-wide text-ink-muted">{getLabel(p.type_id)}</p>
        <p class="font-condensed text-lg font-semibold">{p.title}</p>
        {#if p.keyAttrs.length}
          <p class="mt-1 flex flex-wrap gap-1">
            {#each p.keyAttrs as a (a)}
              <span class="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-ink-muted">{a}</span>
            {/each}
          </p>
        {/if}
        <p class="mt-1 text-sm text-ink-muted">{p.status}</p>
      </div>
      <form method="POST" action="?/linkPart">
        <input type="hidden" name="item" value={data.itemKey} />
        <input type="hidden" name="partId" value={p.id} />
        <button
          type="submit"
          class="inline-flex min-h-[44px] items-center gap-1 rounded-md px-4 py-2 font-medium {data.linkedPartId === p.id ? 'border border-accent text-accent' : 'bg-accent text-accent-ink'}"
        >
          {#if data.linkedPartId === p.id}<Check size={16} aria-hidden="true" /> Linked{:else}Link{/if}
        </button>
      </form>
    </div>
  </li>
{/snippet}

{#if data.compatible.length}
  <ul class="space-y-3">
    {#each data.compatible as p (p.id)}
      {@render partRow(p)}
    {/each}
  </ul>
{:else}
  <div class="rounded-lg border border-border bg-surface p-6 text-center">
    <p class="mb-4 text-ink-muted">No compatible parts found.</p>
    <div class="flex flex-wrap justify-center gap-3">
      <a
        href={`/parts/new${data.typeId ? `?type=${data.typeId}` : ''}`}
        class="inline-flex min-h-[44px] items-center gap-1 rounded-md bg-accent px-4 py-2 font-semibold text-accent-ink"
      >
        <Plus size={16} aria-hidden="true" /> Add a new part
      </a>
      {#if !data.showAll}
        <a
          href={`/bikes/${bikeId}/checklist/link-part?item=${encodeURIComponent(data.itemKey)}&all=1`}
          class="inline-flex min-h-[44px] items-center rounded-md border border-border px-4 py-2 font-medium"
        >
          Show all parts anyway
        </a>
      {/if}
    </div>
  </div>
{/if}

{#if data.incompatible.length}
  <section class="mt-8" aria-labelledby="incompat">
    <h2 id="incompat" class="mb-3 font-condensed text-lg font-semibold text-for-sale">
      Incompatible with current configuration
    </h2>
    <p class="mb-3 text-sm text-ink-muted">
      These are parts you own that don’t match the current build — shown here so they’re never hidden.
    </p>
    <ul class="space-y-3 opacity-80">
      {#each data.incompatible as p (p.id)}
        {@render partRow(p)}
      {/each}
    </ul>
  </section>
{/if}

<p class="mt-8">
  <a href={backHref} class="text-accent underline">← Back to checklist</a>
</p>
