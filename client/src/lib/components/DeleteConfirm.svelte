<script lang="ts">
  import { createDialog, melt } from '@melt-ui/svelte';
  import { enhance } from '$app/forms';
  import { Trash2, TriangleAlert } from '@lucide/svelte';

  // Baseline (no JS): the trigger is a plain link to the confirm-delete PAGE.
  // Enhancement (JS): the click opens a Melt UI alertdialog wrapping the SAME
  // delete form action (§6 contract).
  let {
    confirmHref,
    action,
    label = 'Delete',
    title = 'Delete this item?',
    message = 'This cannot be undone.'
  }: {
    confirmHref: string;
    action: string;
    label?: string;
    title?: string;
    message?: string;
  } = $props();

  const {
    elements: { overlay, content, title: titleEl, description, portalled },
    states: { open }
  } = createDialog({ role: 'alertdialog', forceVisible: true });
</script>

<a
  href={confirmHref}
  onclick={(e) => {
    // Only intercept when JS is running; otherwise the link navigates.
    e.preventDefault();
    open.set(true);
  }}
  class="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-red-500/50 px-4 py-2 font-medium text-red-400 hover:bg-red-500/10"
>
  <Trash2 size={18} aria-hidden="true" />
  {label}
</a>

{#if $open}
  <div use:melt={$portalled}>
    <div use:melt={$overlay} class="fixed inset-0 z-50 bg-black/60"></div>
    <div
      use:melt={$content}
      class="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface p-6 shadow-xl"
    >
      <h2 use:melt={$titleEl} class="flex items-center gap-2 font-condensed text-xl font-semibold text-ink">
        <TriangleAlert size={20} class="text-for-sale" aria-hidden="true" />
        {title}
      </h2>
      <p use:melt={$description} class="mt-2 text-ink-muted">{message}</p>

      <form method="POST" {action} use:enhance class="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onclick={() => open.set(false)}
          class="min-h-[44px] rounded-md border border-border px-4 py-2 text-ink"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-500"
        >
          <Trash2 size={18} aria-hidden="true" />
          {label}
        </button>
      </form>
    </div>
  </div>
{/if}
