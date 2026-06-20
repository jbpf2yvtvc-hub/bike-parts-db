<script lang="ts">
  import type { Snippet } from 'svelte';

  // A framed live example. It renders the *real* component but neutralizes side
  // effects so the gallery is safe to click around in:
  //   - All form submissions are cancelled. (The design pages have no real
  //     forms/actions, and Melt UI dialogs portal their form to <body>, outside
  //     this wrapper — so the guard is attached at the document level.)
  //   - When `interactive` is false, in-example link/button navigation is
  //     cancelled too, so cards and links don't navigate away. Set `interactive`
  //     for examples whose behavior is the point (dialogs, form inputs).
  let {
    title = undefined,
    description = undefined,
    interactive = false,
    children
  }: {
    title?: string;
    description?: string;
    interactive?: boolean;
    children: Snippet;
  } = $props();

  let host = $state<HTMLDivElement>();

  $effect(() => {
    const onSubmit = (e: Event) => {
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    document.addEventListener('submit', onSubmit, true);

    let onClick: ((e: MouseEvent) => void) | undefined;
    if (!interactive && host) {
      onClick = (e: MouseEvent) => {
        if ((e.target as HTMLElement | null)?.closest('a, button')) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      };
      host.addEventListener('click', onClick, true);
    }

    return () => {
      document.removeEventListener('submit', onSubmit, true);
      if (onClick && host) host.removeEventListener('click', onClick, true);
    };
  });
</script>

<figure class="rounded-lg border border-border bg-surface">
  {#if title}
    <figcaption class="border-b border-border px-4 py-2">
      <p class="font-condensed text-sm font-semibold uppercase tracking-wide text-ink">{title}</p>
      {#if description}<p class="mt-0.5 text-sm font-normal text-ink-muted">{description}</p>{/if}
    </figcaption>
  {/if}
  <div class="p-4" bind:this={host}>
    {@render children()}
  </div>
</figure>
