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
    <h1 class="font-condensed text-2xl font-bold">{title}</h1>
  </div>
  <DispositionBadge disposition={part.disposition} />
</div>

{#if part.expand?.bike}
  <p class="mb-4 flex items-center gap-1 text-ink-muted">
    <MapPin size={16} aria-hidden="true" /> On bike:
    <a href={`/bikes/${part.expand.bike.id}`} class="text-accent underline">{part.expand.bike.name}</a>
  </p>
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
  <a href={`/parts/${part.id}/edit`} class="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-border px-4 py-2 font-medium">
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
