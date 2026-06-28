<script lang="ts">
  import { Keyboard, X } from '@lucide/svelte';
  import { SHORTCUT_GROUPS } from '$lib/shortcuts';

  // `open` is controlled by the parent (the global key handler opens it on "?").
  // Built with plain Svelte — this project has no Melt preprocessor, so `use:melt`
  // throws at runtime; the close/Escape/outside-click handlers below are native.
  let { open = $bindable(false) }: { open?: boolean } = $props();

  let dialogEl = $state<HTMLDivElement | null>(null);
  let restoreFocus: HTMLElement | null = null;

  function close() {
    open = false;
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === 'Tab') {
      // Minimal focus trap so Tab stays within the dialog.
      const focusables = dialogEl?.querySelectorAll<HTMLElement>(
        'a[href], button:not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  // Move focus into the dialog on open; restore it to the trigger on close.
  $effect(() => {
    if (open) {
      restoreFocus = document.activeElement as HTMLElement;
      queueMicrotask(() => dialogEl?.focus());
    } else if (restoreFocus) {
      restoreFocus.focus();
      restoreFocus = null;
    }
  });
</script>

{#if open}
  <div class="fixed inset-0 z-50">
    <!-- Click-outside backdrop. A button keeps the dismiss target accessible;
         tabindex -1 keeps it out of the Tab cycle so the trap works. -->
    <button
      type="button"
      aria-label="Close shortcuts help"
      tabindex="-1"
      onclick={close}
      class="absolute inset-0 bg-black/60"
    ></button>

    <div
      bind:this={dialogEl}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      aria-describedby="shortcuts-desc"
      tabindex="-1"
      onkeydown={onKeydown}
      class="absolute left-1/2 top-1/2 max-h-[85vh] w-[90vw] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-surface p-6 shadow-xl"
    >
      <div class="flex items-start justify-between gap-4">
        <h2
          id="shortcuts-title"
          class="flex items-center gap-2 font-condensed text-xl font-semibold text-ink"
        >
          <Keyboard size={20} class="text-accent" aria-hidden="true" />
          Keyboard shortcuts
        </h2>
        <button type="button" onclick={close} class="rounded-md p-1 text-ink-muted hover:text-ink" aria-label="Close">
          <X size={20} aria-hidden="true" />
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
  </div>
{/if}
