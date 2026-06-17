<script lang="ts">
  import { page } from '$app/stores';
  import { NAV_ITEMS, isActive } from './nav-items';
</script>

<!-- Mobile bottom nav (§4): <= 5 targets, 44px min height, icon + label.
     Hidden on lg where the sidebar takes over. -->
<nav
  class="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface lg:hidden"
  aria-label="Primary"
>
  <ul class="mx-auto flex max-w-2xl">
    {#each NAV_ITEMS as item (item.href)}
      {@const active = isActive($page.url.pathname, item.href)}
      <li class="flex-1">
        <a
          href={item.href}
          class="flex min-h-[44px] flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium {active
            ? 'text-accent'
            : 'text-ink-muted'}"
          aria-current={active ? 'page' : undefined}
        >
          <item.icon size={22} aria-hidden="true" />
          <span>{item.label}</span>
        </a>
      </li>
    {/each}
  </ul>
</nav>
