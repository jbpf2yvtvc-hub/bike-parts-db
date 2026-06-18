<script lang="ts">
  import { page } from '$app/stores';
  import { NAV_ITEMS, isActive } from './nav-items';
</script>

<!-- Desktop left sidebar (§4), shown only at lg+. -->
<nav
  class="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-border bg-surface p-4 lg:flex"
  aria-label="Primary"
>
  <a href="/" class="mb-6 block font-display text-2xl uppercase tracking-wide text-accent">
    Bike Parts DB
  </a>
  <ul class="flex flex-col gap-1">
    {#each NAV_ITEMS as item (item.href)}
      {@const active = isActive($page.url.pathname, item.href)}
      <li>
        <a
          href={item.href}
          class="flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2 text-sm font-medium {active
            ? 'bg-surface-2 text-accent'
            : 'text-ink-muted hover:text-ink'}"
          aria-current={active ? 'page' : undefined}
        >
          <item.icon size={20} aria-hidden="true" />
          <span>{item.label}</span>
        </a>
      </li>
    {/each}
  </ul>
</nav>
