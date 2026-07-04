<script lang="ts">
  import { Keyboard, X } from '@lucide/svelte';
  import { SHORTCUT_GROUPS } from '$lib/shortcuts';

  // `open` is controlled by the parent (the global key handler opens it on "?").
  // Native <dialog> + showModal() provides the modal semantics, focus trap,
  // Escape handling, and focus restore — no manual key/focus management needed.
  let { open = $bindable(false) }: { open?: boolean } = $props();

  let dialogEl = $state<HTMLDialogElement | null>(null);

  // Sync the prop with the native dialog state in both directions.
  $effect(() => {
    if (open && !dialogEl?.open) dialogEl?.showModal();
    else if (!open && dialogEl?.open) dialogEl?.close();
  });

  // Fires on close() and on native Escape (cancel → close).
  function onClose() {
    open = false;
  }

  // Light dismiss: clicks on the backdrop are targeted at the <dialog> element
  // itself. Padding lives on the inner div so content clicks never match.
  function onClick(e: MouseEvent) {
    if (e.target === dialogEl) dialogEl?.close();
  }
</script>

<dialog
  bind:this={dialogEl}
  onclose={onClose}
  onclick={onClick}
  aria-labelledby="shortcuts-title"
  aria-describedby="shortcuts-desc"
  class="m-auto max-h-[85vh] w-[90vw] max-w-lg overflow-y-auto rounded-lg border border-border bg-surface text-ink shadow-xl backdrop:bg-black/60"
>
  <div class="p-6">
    <div class="flex items-start justify-between gap-4">
      <h2
        id="shortcuts-title"
        class="flex items-center gap-2 font-condensed text-xl font-semibold text-ink"
      >
        <Keyboard size={20} class="text-accent" aria-hidden="true" />
        Keyboard shortcuts
      </h2>
      <button type="button" onclick={() => dialogEl?.close()} class="rounded-md p-1 text-ink-muted hover:text-ink">
        <X size={20} aria-hidden="true" />
        <span class="sr-only">Close</span>
      </button>
    </div>
    <p id="shortcuts-desc" class="mt-1 text-sm text-ink-muted">
      Press the keys in sequence. Shortcuts are disabled while typing in a field.
    </p>

    <div class="mt-4 flex flex-col gap-5">
      {#each SHORTCUT_GROUPS as group (group.title)}
        <section>
          <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {group.title}
          </h3>
          <ul class="flex flex-col gap-1.5">
            {#each group.items as item (item.label)}
              <li class="flex items-center justify-between gap-4">
                <span class="text-sm text-ink">{item.label}</span>
                <span class="flex shrink-0 items-center gap-1">
                  {#each item.keys as k (k)}
                    <kbd
                      class="min-w-[1.5rem] rounded border border-border bg-surface-2 px-1.5 py-0.5 text-center font-mono text-xs text-ink"
                    >
                      {k}
                    </kbd>
                  {/each}
                </span>
              </li>
            {/each}
          </ul>
        </section>
      {/each}
    </div>
  </div>
</dialog>
