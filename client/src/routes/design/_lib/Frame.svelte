<script lang="ts">
  import type { Snippet } from 'svelte';

  // Establishes a containing block (via `transform`) so descendants using
  // `position: fixed` / `sticky` (BottomNav, SideNav) are contained to this box
  // instead of escaping to the viewport and overlapping the real app chrome.
  let { height = '8rem', children }: { height?: string; children: Snippet } = $props();
</script>

<div
  class="relative overflow-hidden rounded-md border border-border bg-ground"
  style="height: {height}; transform: translateZ(0)"
>
  {@render children()}
</div>
