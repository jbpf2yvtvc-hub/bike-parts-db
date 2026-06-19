<script lang="ts">
  import { TriangleAlert, Trash2 } from '@lucide/svelte';
  let { data, form } = $props();
</script>

<svelte:head><title>Delete {data.title}? · Bike Parts DB</title></svelte:head>

<!-- No-JS confirmation page (§6.4). Two-step delete everywhere. -->
<div class="mx-auto max-w-lg rounded-lg border border-red-500/40 bg-surface p-6">
  <h1 class="flex items-center gap-2 font-condensed text-2xl font-bold">
    <TriangleAlert size={24} class="text-for-sale" aria-hidden="true" />
    Delete this part?
  </h1>
  <p class="mt-3 text-ink-muted">
    You are about to permanently delete <strong class="text-ink">{data.title}</strong>. This cannot be undone.
  </p>

  {#if form?.error}
    <p role="alert" class="mt-4 rounded-md border border-red-500/50 bg-red-500/10 p-3 text-red-300">{form.error}</p>
  {/if}

  <div class="mt-6 flex justify-end gap-3">
    <a href={`/parts/${data.partId}`} class="btn min-h-[44px] rounded-md border border-border px-4 py-2 font-medium">Cancel</a>
    <form method="POST">
      <button type="submit" class="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-red-600 px-4 py-2 font-medium text-white">
        <Trash2 size={18} aria-hidden="true" /> Delete
      </button>
    </form>
  </div>
</div>
