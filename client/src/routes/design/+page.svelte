<script lang="ts">
  import { Palette, Component, LayoutGrid, ListChecks, ShieldCheck, EyeOff } from '@lucide/svelte';

  const cards = [
    { href: '/design/foundations', icon: Palette, title: 'Foundations', body: 'Color, type, spacing, radius, elevation, focus, motion, icons.' },
    { href: '/design/components', icon: Component, title: 'Components', body: 'All 11 building blocks, rendered live in their key states.' },
    { href: '/design/patterns', icon: LayoutGrid, title: 'Patterns', body: 'Forms, cards, navigation, destructive confirmation.' },
    { href: '/design/recommendations', icon: ListChecks, title: 'Recommendations', body: 'Where the app diverges from the system, with fixes.' }
  ];

  const principles = [
    { icon: ShieldCheck, title: 'Accessibility is law', body: 'WCAG 2.2 AA is a constraint, not a goal: AA contrast, 44px targets, a visible focus ring, labels above fields, and meaning never carried by color alone.' },
    { icon: EyeOff, title: 'No-JS-first', body: 'Every core action works as plain HTML; JavaScript only enhances. Components degrade gracefully.' },
    { icon: Palette, title: 'Semantic tokens', body: 'Colors are named by role (ground, surface, ink, accent, disposition) — never by raw hue — so intent travels with the value.' },
    { icon: Component, title: 'Living, not copied', body: 'This guide imports the real components and reads the real CSS variables, so it tracks the app instead of drifting from it.' }
  ];
</script>

<section class="mb-10">
  <h2 class="mb-4 font-condensed text-lg font-semibold text-ink">Principles</h2>
  <div class="grid gap-3 sm:grid-cols-2">
    {#each principles as p (p.title)}
      <div class="rounded-lg border border-border bg-surface p-4">
        <p class="flex items-center gap-2 font-condensed font-semibold text-ink">
          <p.icon size={18} class="text-accent" aria-hidden="true" />
          {p.title}
        </p>
        <p class="mt-1 text-sm text-ink-muted normal-case">{p.body}</p>
      </div>
    {/each}
  </div>
</section>

<section>
  <h2 class="mb-4 font-condensed text-lg font-semibold text-ink">Explore</h2>
  <div class="grid gap-3 sm:grid-cols-2">
    {#each cards as c (c.href)}
      <a href={c.href} class="block rounded-lg border border-border bg-surface p-4 hover:border-accent">
        <p class="flex items-center gap-2 font-condensed font-semibold text-ink">
          <c.icon size={18} class="text-accent" aria-hidden="true" />
          {c.title}
        </p>
        <p class="mt-1 text-sm text-ink-muted normal-case">{c.body}</p>
      </a>
    {/each}
  </div>
</section>
