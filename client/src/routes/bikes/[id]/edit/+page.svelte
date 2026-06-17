<script lang="ts">
  import BikeForm from '$lib/components/BikeForm.svelte';
  let { data, form } = $props();
  const values = $derived(form?.values ?? data.bike);
</script>

<svelte:head><title>Edit {data.bike.name} · Bike Parts DB</title></svelte:head>

<nav class="mb-4 text-sm text-ink-muted">
  <a href="/bikes" class="text-accent underline">Bikes</a> /
  <a href={`/bikes/${data.bike.id}`} class="text-accent underline">{data.bike.name}</a> / Edit
</nav>

<h1 class="mb-6 font-display text-3xl tracking-wide text-accent">Edit bike</h1>

<BikeForm {values} errors={form?.errors ?? {}} submitLabel="Save changes" />
