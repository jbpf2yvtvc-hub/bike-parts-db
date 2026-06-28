<script lang="ts">
  import '../app.css';
  import { get } from 'svelte/store';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import BottomNav from '$lib/components/BottomNav.svelte';
  import SideNav from '$lib/components/SideNav.svelte';
  import ShortcutsOverlay from '$lib/components/ShortcutsOverlay.svelte';
  import { createShortcutHandler } from '$lib/shortcuts';
  import type { Snippet } from 'svelte';

  let { data, children }: { data: { user: unknown }; children: Snippet } = $props();

  let helpOpen = $state(false);

  const handleShortcut = createShortcutHandler({
    goto: (url) => goto(url),
    getPath: () => get(page).url.pathname,
    openHelp: () => (helpOpen = true)
  });

  // svelte:window must be top-level, so gate on auth inside the handler.
  function onWindowKeydown(event: KeyboardEvent) {
    if (!data.user) return;
    handleShortcut(event);
  }
</script>

<svelte:window onkeydown={onWindowKeydown} />

<!-- Skip link must be the first focusable element (§3 Operable, step 2). -->
<a
  href="#main"
  class="sr-only z-50 rounded-md bg-accent px-4 py-2 font-medium text-accent-ink focus:not-sr-only focus:fixed focus:left-2 focus:top-2"
>
  Skip to main content
</a>

{#if data.user}
  <div class="flex min-h-dvh">
    <SideNav />
    <div class="flex-1">
      <main id="main" tabindex="-1" class="mx-auto max-w-3xl px-4 pb-24 pt-4 lg:pb-10">
        {@render children()}
      </main>
    </div>
  </div>
  <BottomNav />

  <!-- Desktop-only discoverability hint. Hidden under lg (mobile relies on the
       bottom nav and rarely has a hardware keyboard). -->
  <button
    type="button"
    onclick={() => (helpOpen = true)}
    class="fixed bottom-4 right-4 z-30 hidden items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-ink-muted shadow-sm hover:text-ink lg:flex"
    aria-haspopup="dialog"
  >
    Shortcuts
    <kbd class="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-ink">?</kbd>
  </button>

  <ShortcutsOverlay bind:open={helpOpen} />
{:else}
  <main id="main" tabindex="-1" class="mx-auto max-w-md px-4 py-10">
    {@render children()}
  </main>
{/if}
