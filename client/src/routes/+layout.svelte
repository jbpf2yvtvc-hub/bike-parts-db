<script lang="ts">
  import '../app.css';
  import BottomNav from '$lib/components/BottomNav.svelte';
  import SideNav from '$lib/components/SideNav.svelte';
  import type { Snippet } from 'svelte';

  let { data, children }: { data: { user: unknown }; children: Snippet } = $props();
</script>

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
{:else}
  <main id="main" tabindex="-1" class="mx-auto max-w-md px-4 py-10">
    {@render children()}
  </main>
{/if}
