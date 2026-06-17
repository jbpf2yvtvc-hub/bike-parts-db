<script lang="ts">
  import PartForm from '$lib/components/PartForm.svelte';
  let { data, form } = $props();

  // No-JS: the type <select> is in a GET form with a submit button, reloading
  // to swap fields. JS: submit on change for instant swap (§6.1).
  function onTypeChange(e: Event) {
    (e.currentTarget as HTMLSelectElement).form?.requestSubmit();
  }
</script>

<svelte:head><title>Add part · Bike Parts DB</title></svelte:head>

<h1 class="mb-6 font-display text-3xl tracking-wide text-accent">Add a part</h1>

<form method="GET" class="mb-6">
  <label for="type" class="block font-medium">Part type</label>
  <div class="mt-1 flex gap-2">
    <select id="type" name="type" onchange={onTypeChange}
      class="block w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 py-2">
      <option value="">— Choose a type —</option>
      {#each data.schemas as s (s.type_id)}
        <option value={s.type_id} selected={data.typeId === s.type_id}>{s.label}</option>
      {/each}
    </select>
    <noscript>
      <button type="submit" class="min-h-[44px] rounded-md border border-border px-4 py-2">Choose</button>
    </noscript>
  </div>
</form>

{#if data.schema}
  {#key data.schema.type_id}
    <PartForm
      schema={data.schema}
      bikes={data.bikes}
      attributes={form?.values ?? {}}
      meta={form?.meta ?? {}}
      errors={form?.errors ?? {}}
      submitLabel="Add part"
    />
  {/key}
{:else}
  <p class="text-ink-muted">Choose a part type to begin.</p>
{/if}
