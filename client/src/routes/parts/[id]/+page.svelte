<script lang="ts">
  import DispositionBadge from '$lib/components/DispositionBadge.svelte';
  import DeleteConfirm from '$lib/components/DeleteConfirm.svelte';
  import { getLabel } from '$lib/schema-utils';
  import { Pencil, MapPin } from '@lucide/svelte';
  let { data } = $props();

  const part = $derived(data.part);
  const title = $derived(
    [part.attributes?.brand, part.attributes?.model].filter(Boolean).join(' ') ||
      getLabel(part.type_id)
  );

  function display(value: unknown): string {
    if (value == null || value === '') return '—';
    if (Array.isArray(value)) return value.join(', ') || '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  }
</script>

<svelte:head><title>{title} · Bike Parts DB</title></svelte:head>

<nav class="mb-4 text-sm text-ink-muted"><a href="/parts" class="text-accent underline">Parts</a> / {getLabel(part.type_id)}</nav>

<div class="mb-4 flex items-start justify-between gap-3">
  <div>
    <p class="text-xs uppercase tracking-wide text-ink-muted">{getLabel(part.type_id)}</p>
    <h1 class="font-condensed text-2xl font-bold">
      {title}{#if (part.quantity ?? 1) > 1}<span class="ml-2 text-lg font-normal text-ink-muted">×{part.quantity}</span>{/if}
    </h1>
  </div>
  <DispositionBadge disposition={part.disposition} />
</div>

<p class="mb-1 text-ink-muted">Quantity owned: <span class="text-ink">{part.quantity ?? 1}</span></p>

{#if part.expand?.bikes?.length}
  <p class="mb-4 flex flex-wrap items-center gap-1 text-ink-muted">
    <MapPin size={16} aria-hidden="true" /> On {part.expand.bikes.length === 1 ? 'bike' : 'bikes'}:
    {#each part.expand.bikes as b, i (b.id)}<a href={`/bikes/${b.id}`} class="text-accent underline">{b.name}</a>{#if (part.bike_qty?.[b.id] ?? 1) > 1}<span class="text-ink">&nbsp;×{part.bike_qty[b.id]}</span>{/if}{#if i < part.expand.bikes.length - 1}<span>,</span>{/if}{/each}
  </p>
{:else}
  <p class="mb-4 text-ink-muted">Not on a bike.</p>
{/if}

{#if data.associations?.length}
  <div class="mb-4 rounded-lg border border-border bg-surface p-4">
    <h2 class="mb-2 font-condensed text-lg font-semibold">Associated parts</h2>
    <dl class="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
      {#each data.associations as a (a.label)}
        <div>
          <dt class="text-sm text-ink-muted">{a.label}</dt>
          <dd class="font-medium">
            {#each a.parts as p, i (p.id)}<a href={`/parts/${p.id}`} class="text-accent underline">{p.title}</a>{#if i < a.parts.length - 1}<span>, </span>{/if}{/each}
          </dd>
        </div>
      {/each}
    </dl>
  </div>
{/if}

{#if data.schema}
  <dl class="grid grid-cols-1 gap-x-6 gap-y-2 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2">
    {#each data.schema.fields as field (field.id)}
      <div class="flex justify-between gap-4 border-b border-border/50 py-1 sm:block sm:border-0">
        <dt class="text-sm text-ink-muted">{field.label}</dt>
        <dd class="font-medium">{display(part.attributes?.[field.id])}</dd>
      </div>
    {/each}
  </dl>
{/if}

<div class="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg border border-border bg-surface p-4 text-sm">
  <div><dt class="text-ink-muted">Acquired</dt><dd>{part.acquisition_date || '—'}</dd></div>
  <div><dt class="text-ink-muted">Acquisition price</dt><dd>{part.acquisition_price ?? '—'}</dd></div>
  <div><dt class="text-ink-muted">Asking price</dt><dd>{part.asking_price ?? '—'}</dd></div>
</div>

<div class="mt-6 flex flex-wrap gap-3">
  <a href={`/parts/${part.id}/edit`} class="btn inline-flex min-h-[44px] items-center gap-2 rounded-md border border-border px-4 py-2 font-medium">
    <Pencil size={18} aria-hidden="true" /> Edit
  </a>
  <DeleteConfirm
    confirmHref={`/parts/${part.id}/confirm-delete`}
    action={`/parts/${part.id}?/delete`}
    label="Delete"
    title="Delete this part?"
    message="This permanently removes the part from your inventory. This cannot be undone."
  />
</div>
