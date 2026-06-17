<script lang="ts">
  import PartForm from '$lib/components/PartForm.svelte';
  import { getLabel } from '$lib/schema-utils';
  let { data, form } = $props();

  const part = $derived(data.part);

  // Prefer resubmitted values on error, else the stored record.
  const attributes = $derived(form?.values ?? part.attributes ?? {});
  const meta = $derived(
    form?.meta ?? {
      disposition: part.disposition,
      bike: part.bike ?? '',
      acquisition_date: part.acquisition_date ?? '',
      acquisition_price: part.acquisition_price ?? '',
      asking_price: part.asking_price ?? ''
    }
  );
</script>

<svelte:head><title>Edit {getLabel(part.type_id)} · Bike Parts DB</title></svelte:head>

<nav class="mb-4 text-sm text-ink-muted">
  <a href="/parts" class="text-accent underline">Parts</a> /
  <a href={`/parts/${part.id}`} class="text-accent underline">{getLabel(part.type_id)}</a> / Edit
</nav>

<h1 class="mb-6 font-display text-3xl tracking-wide text-accent">Edit {getLabel(part.type_id)}</h1>

<PartForm
  schema={data.schema}
  bikes={data.bikes}
  {attributes}
  {meta}
  errors={form?.errors ?? {}}
  submitLabel="Save changes"
/>
