<script lang="ts">
  import { getLabel } from '$lib/schema-utils';
  import { Plus, Check } from '@lucide/svelte';
  import { untrack } from 'svelte';
  import SwitchConfirm from '$lib/components/SwitchConfirm.svelte';
  let { data }: { data: any } = $props();

  const bikeId = untrack(() => data.bike.id);
  const backHref = `/bikes/${bikeId}/checklist`;
  const addHref = $derived(`/parts/new?type=${data.typeId ?? ''}`);
  const showAllHref = $derived(
    `/bikes/${bikeId}/checklist/link-part?item=${encodeURIComponent(data.itemKey)}&all=1`
  );
  const switchHref = (partId: string) =>
    `/bikes/${bikeId}/checklist/link-part/switch?item=${encodeURIComponent(data.itemKey)}&partId=${partId}`;
</script>

<svelte:head><title>Link a part · {data.itemTitle}</title></svelte:head>

<nav class="mb-3 text-sm text-ink-muted">
  <a href="/bikes" class="text-accent underline">Bikes</a> /
  <a href={`/bikes/${bikeId}`} class="text-accent underline">{data.bike.name}</a> /
  <a href={backHref} class="text-accent underline">Checklist</a> / Link
</nav>

<h1 class="mb-1 font-display text-3xl tracking-wide text-accent">Link a part</h1>
<p class="mb-4 font-condensed text-lg text-ink-muted">
  {data.itemTitle}{#if data.typeId} · {getLabel(data.typeId)}{/if}
</p>

<!-- Always available, regardless of how many parts (if any) are listed. -->
<div class="mb-6 flex flex-wrap gap-3">
  <a
    href={addHref}
    class="btn inline-flex min-h-[44px] items-center gap-1 rounded-md bg-accent px-4 py-2 font-semibold text-accent-ink"
  >
    <Plus size={16} aria-hidden="true" /> Add a new part
  </a>
  {#if !data.showAll}
    <a href={showAllHref} class="btn inline-flex min-h-[44px] items-center rounded-md border border-border px-4 py-2 font-medium">
      Show all parts anyway
    </a>
  {/if}
</div>

{#snippet partRow(p: any)}
  <li class="rounded-lg border border-border bg-surface p-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-xs uppercase tracking-wide text-ink-muted">{getLabel(p.type_id)}</p>
        <p class="font-condensed text-lg font-semibold">{p.title}</p>
        {#if p.keyAttrs.length}
          <p class="mt-1 flex flex-wrap gap-1">
            <!-- Key by index: keyAttrs are raw attribute *values*, which can
                 collide (e.g. a stem with angle_deg 80 and length_mm 80 yields
                 two "80" chips). A value key would throw each_key_duplicate and
                 abort the navigation, stranding you on the checklist. -->
            {#each p.keyAttrs as a, i (i)}
              <span class="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-ink-muted">{a}</span>
            {/each}
          </p>
        {/if}
        <p class="mt-1 text-sm text-ink-muted">{p.status}</p>
        <p class="mt-1 text-xs text-ink-muted">
          Qty {p.quantity} ·
          <span class={p.available > 0 ? 'text-keep' : 'text-for-sale'}>
            {p.available} available
          </span>
        </p>
      </div>

      <div class="shrink-0">
        {#if data.linkedPartId === p.id}
          <span class="inline-flex min-h-[44px] items-center gap-1 rounded-md border border-accent px-4 py-2 font-medium text-accent">
            <Check size={16} aria-hidden="true" /> Linked
          </span>
        {:else if !p.onThisBike && p.available <= 0}
          <!-- Fully assigned elsewhere — confirm a switch before moving it. -->
          <SwitchConfirm
            confirmHref={switchHref(p.id)}
            action="?/linkPart"
            item={data.itemKey}
            partId={p.id}
            partTitle={p.title}
            otherBikes={p.otherBikes}
            thisBikeName={data.bike.name}
          />
        {:else}
          <form method="POST" action="?/linkPart">
            <input type="hidden" name="item" value={data.itemKey} />
            <input type="hidden" name="partId" value={p.id} />
            <button type="submit" class="inline-flex min-h-[44px] items-center rounded-md bg-accent px-4 py-2 font-medium text-accent-ink">
              Link
            </button>
          </form>
        {/if}
      </div>
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
  <p class="rounded-lg border border-border bg-surface p-6 text-center text-ink-muted">
    No compatible parts found. Use <strong class="text-ink">Add a new part</strong> above{#if !data.showAll}, or
    <strong class="text-ink">Show all parts anyway</strong>{/if}.
  </p>
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
