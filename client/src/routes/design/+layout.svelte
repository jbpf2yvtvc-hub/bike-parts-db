<script lang="ts">
  import { page } from '$app/stores';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();

  const SECTIONS = [
    { href: '/design', label: 'Overview' },
    { href: '/design/foundations', label: 'Foundations' },
    { href: '/design/components', label: 'Components' },
    { href: '/design/patterns', label: 'Patterns' },
    { href: '/design/recommendations', label: 'Recommendations' }
  ];

  const active = (href: string) =>
    href === '/design' ? $page.url.pathname === '/design' : $page.url.pathname.startsWith(href);
</script>

<svelte:head>
  <!-- Internal reference; unlinked from the app and kept out of search indexes. -->
  <meta name="robots" content="noindex" />
  <title>Design System · Bike Parts DB</title>
</svelte:head>

<header class="mb-6">
  <p class="text-xs uppercase tracking-wide text-ink-muted">Internal reference</p>
  <h1 class="font-display text-2xl font-semibold text-accent">Design System</h1>
  <p class="mt-1 text-sm text-ink-muted">
    The tokens, components, and patterns that make up Bike Parts DB — rendered live from the real
    source. Not linked anywhere in the app; visible to any signed-in user.
  </p>
</header>

<nav aria-label="Design system sections" class="mb-8 border-b border-border">
  <ul class="-mb-px flex flex-wrap gap-1">
    {#each SECTIONS as s (s.href)}
      {@const on = active(s.href)}
      <li>
        <a
          href={s.href}
          class="inline-block border-b-2 px-3 py-2 text-sm font-medium {on
            ? 'border-accent text-accent'
            : 'border-transparent text-ink-muted hover:text-ink'}"
          aria-current={on ? 'page' : undefined}
        >
          {s.label}
        </a>
      </li>
    {/each}
  </ul>
</nav>

{@render children()}
