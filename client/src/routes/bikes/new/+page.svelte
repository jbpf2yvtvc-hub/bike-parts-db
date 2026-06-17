<script lang="ts">
  import BikeForm from '$lib/components/BikeForm.svelte';
  let { form } = $props();
</script>

<svelte:head><title>Add bike · Bike Parts DB</title></svelte:head>

<h1 class="mb-6 font-display text-3xl tracking-wide text-accent">Add a bike</h1>

<BikeForm values={form?.values ?? {}} errors={form?.errors ?? {}} submitLabel="Add bike" />
