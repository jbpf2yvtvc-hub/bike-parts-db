<script lang="ts">
  import { createDialog, melt } from '@melt-ui/svelte';
  import { enhance } from '$app/forms';
  import { ArrowLeftRight, TriangleAlert } from '@lucide/svelte';

  // Baseline (no JS): a link to the switch-confirm PAGE.
  // Enhancement (JS): the click opens a Melt UI alertdialog that posts the
  // confirmed switch to the same linkPart action (confirm=1).
  let {
    confirmHref,
    action,
    item,
    partId,
    partTitle,
    otherBikes,
    thisBikeName
  }: {
    confirmHref: string;
    action: string;
    item: string;
    partId: string;
    partTitle: string;
    otherBikes: { id: string; name: string }[];
    thisBikeName: string;
  } = $props();

  const multi = $derived(otherBikes.length > 1);

  const {
    elements: { overlay, content, title: titleEl, description, portalled },
    states: { open }
  } = createDialog({ role: 'alertdialog', forceVisible: true });
</script>

<a
  href={confirmHref}
  onclick={(e) => {
    e.preventDefault();
    open.set(true);
  }}
  class="btn inline-flex min-h-[44px] items-center gap-1 rounded-md border border-accent px-4 py-2 font-medium text-accent hover:bg-accent/10"
>
  <ArrowLeftRight size={16} aria-hidden="true" />
  Switch to this bike
</a>

{#if $open}
  <div use:melt={$portalled}>
    <div use:melt={$overlay} class="fixed inset-0 z-50 bg-black/60"></div>
    <div
      use:melt={$content}
      class="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface p-6 shadow-xl"
    >
      <h2 use:melt={$titleEl} class="flex items-center gap-2 font-condensed text-xl font-semibold text-ink">
        <TriangleAlert size={20} class="text-for-sale" aria-hidden="true" />
        Switch this part to {thisBikeName}?
      </h2>
      <p use:melt={$description} class="mt-2 text-ink-muted">
        <strong class="text-ink">{partTitle}</strong> has no free units left — every one is already
        on a bike. Switching moves one onto <strong class="text-ink">{thisBikeName}</strong>.
      </p>

      <form method="POST" {action} use:enhance class="mt-4">
        <input type="hidden" name="item" value={item} />
        <input type="hidden" name="partId" value={partId} />
        <input type="hidden" name="confirm" value="1" />

        {#if multi}
          <fieldset class="mb-4">
            <legend class="mb-1 font-medium">Take it off which bike?</legend>
            {#each otherBikes as b, i (b.id)}
              <label class="flex min-h-[44px] items-center gap-2">
                <input type="radio" name="from" value={b.id} checked={i === 0} class="h-4 w-4" />
                <span>{b.name}</span>
              </label>
            {/each}
          </fieldset>
        {:else}
          <input type="hidden" name="from" value={otherBikes[0]?.id} />
          <p class="mb-4 text-sm text-ink-muted">It will be removed from {otherBikes[0]?.name}.</p>
        {/if}

        <div class="flex justify-end gap-3">
        <button type="button" onclick={() => open.set(false)} class="btn btn-secondary">
          Cancel
        </button>
        <button type="submit" class="btn btn-primary">
          <ArrowLeftRight size={16} aria-hidden="true" />
          Switch
        </button>
        </div>
      </form>
    </div>
  </div>
{/if}
