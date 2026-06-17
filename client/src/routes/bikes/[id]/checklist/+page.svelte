<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import {
    SECTIONS,
    itemVisible,
    getTitle,
    getDynamicNote,
    buildSubtitle,
    getConfigWarnings,
    visibleItemKeys,
    itemKey,
    type ChecklistConfig
  } from '$lib/checklist-data';
  import { getCompatibilityFilter } from '$lib/checklist-compatibility';
  import { getLabel } from '$lib/schema-utils';
  import { TriangleAlert, Link2, MapPin, Plus, Check } from '@lucide/svelte';

  let { data }: { data: any } = $props();

  // Seed local state from the server load (intentionally initial-only).
  let config = $state<ChecklistConfig>(untrack(() => ({ ...data.config })));
  let checked = $state(new Set<string>(untrack(() => data.checkedItems)));
  let mounted = $state(false);
  onMount(() => (mounted = true));

  const bikeId = untrack(() => data.bike.id);
  const partLinks = $derived(data.partLinks as Record<string, string>);
  const linkedParts = $derived(data.linkedParts as Record<string, any>);

  const subtitle = $derived(buildSubtitle(config));
  const warnings = $derived(getConfigWarnings(config));
  const visKeys = $derived(visibleItemKeys(config));
  const total = $derived(visKeys.length);
  const done = $derived(visKeys.filter((k) => checked.has(k)).length);
  const pct = $derived(total ? Math.round((done / total) * 100) : 0);

  // --- JS enhancement: debounced persistence (§9.1, step 17) -----------------
  let cfgTimer: ReturnType<typeof setTimeout>;
  let chkTimer: ReturnType<typeof setTimeout>;

  function onConfigChange() {
    // Mirror the server-side normalisation: tension only applies to 1-speed.
    if (config.rear_speeds !== '1') config.tension = 'horizontal';
    clearTimeout(cfgTimer);
    cfgTimer = setTimeout(async () => {
      await fetch('config', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(config)
      });
    }, 350);
  }

  function toggleCheck(key: string) {
    // Optimistic local update, then debounce-save the full set.
    const next = new Set(checked);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    checked = next;
    clearTimeout(chkTimer);
    chkTimer = setTimeout(async () => {
      const fd = new FormData();
      for (const k of checked) fd.append('checked', k);
      await fetch('?/saveChecks', { method: 'POST', body: fd });
    }, 400);
  }

  function linkStatus(p: any): string {
    if (!p) return '';
    if (p.bike === bikeId) return 'On this bike ✓';
    if (p.bike) return `📍 On: ${p.bikeName ?? 'another bike'}`;
    return 'In inventory · not on a bike';
  }

  function hasPicker(key: string): boolean {
    return getCompatibilityFilter(key, config) !== null;
  }
</script>

<svelte:head><title>Build checklist · {data.bike.name}</title></svelte:head>

<nav class="mb-3 text-sm text-ink-muted">
  <a href="/bikes" class="text-accent underline">Bikes</a> /
  <a href={`/bikes/${bikeId}`} class="text-accent underline">{data.bike.name}</a> / Checklist
</nav>

<header class="mb-2">
  <h1 class="font-display text-4xl tracking-wide text-accent">Build checklist</h1>
  <p class="font-condensed text-lg text-ink-muted">{data.bike.name} — {subtitle}</p>
</header>

<!-- Sticky configurator bar with yellow bottom border (§9.6). -->
<div class="sticky top-0 z-30 -mx-4 border-b-2 border-accent bg-ground/95 px-4 py-3 backdrop-blur">
  <form
    method="POST"
    action="config"
    onsubmit={(e) => mounted && e.preventDefault()}
  >
    <fieldset>
      <legend class="sr-only">Build configuration</legend>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <label class="block text-xs">
          <span class="text-ink-muted">Steerer / stem</span>
          <select name="fork" bind:value={config.fork} onchange={onConfigChange} class="mt-1 w-full min-h-[44px] rounded border border-border bg-surface-2 px-2">
            <option value="threaded">threaded</option>
            <option value="threadless">threadless</option>
          </select>
        </label>
        <label class="block text-xs">
          <span class="text-ink-muted">Handlebar</span>
          <select name="bar" bind:value={config.bar} onchange={onConfigChange} class="mt-1 w-full min-h-[44px] rounded border border-border bg-surface-2 px-2">
            <option value="flat">flat</option>
            <option value="drop">drop</option>
          </select>
        </label>
        <label class="block text-xs">
          <span class="text-ink-muted">Brake type</span>
          <select name="brake" bind:value={config.brake} onchange={onConfigChange} class="mt-1 w-full min-h-[44px] rounded border border-border bg-surface-2 px-2">
            <option value="canti">cantilever</option>
            <option value="vbrake">V-brake</option>
            <option value="cp">center-pull</option>
            <option value="disc-short">disc (short pull)</option>
            <option value="disc-long">disc (long pull)</option>
          </select>
        </label>
        <label class="block text-xs">
          <span class="text-ink-muted">Chainrings</span>
          <select name="chainrings" bind:value={config.chainrings} onchange={onConfigChange} class="mt-1 w-full min-h-[44px] rounded border border-border bg-surface-2 px-2">
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
        </label>
        <label class="block text-xs">
          <span class="text-ink-muted">Rear speeds</span>
          <select name="rear_speeds" bind:value={config.rear_speeds} onchange={onConfigChange} class="mt-1 w-full min-h-[44px] rounded border border-border bg-surface-2 px-2">
            {#each ['1', '6', '7', '8', '9', '10', '11', '12'] as s (s)}
              <option value={s}>{s}</option>
            {/each}
          </select>
        </label>
        {#if config.rear_speeds === '1'}
          <label class="block text-xs">
            <span class="text-ink-muted">Chain tension</span>
            <select name="tension" bind:value={config.tension} onchange={onConfigChange} class="mt-1 w-full min-h-[44px] rounded border border-border bg-surface-2 px-2">
              <option value="horizontal">horizontal dropout</option>
              <option value="tensioner">chain tensioner</option>
              <option value="ebb">eccentric BB</option>
            </select>
          </label>
        {:else}
          <input type="hidden" name="tension" value="horizontal" />
        {/if}
      </div>
      {#if !mounted}
        <button type="submit" class="mt-3 min-h-[44px] rounded-md border border-border px-4 py-2 text-sm">
          Update configuration
        </button>
      {/if}
    </fieldset>
  </form>

  <!-- Progress bar -->
  <div class="mt-3">
    <div class="mb-1 flex justify-between text-xs text-ink-muted">
      <span>Progress</span><span>{done} / {total} ({pct}%)</span>
    </div>
    <div
      class="h-2 w-full overflow-hidden rounded-full bg-surface-2"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-label="Checklist completion"
    >
      <div class="h-full bg-accent transition-[width]" style="width: {pct}%"></div>
    </div>
  </div>
</div>

{#if warnings.length}
  <div role="status" class="mt-4 rounded-md border border-for-sale/40 bg-for-sale/10 p-3">
    {#each warnings as w (w)}
      <p class="flex items-start gap-2 text-sm text-for-sale">
        <TriangleAlert size={16} class="mt-0.5 shrink-0" aria-hidden="true" /> {w}
      </p>
    {/each}
  </div>
{/if}

<!-- The checklist itself is one form so it works with no JS (Save button). -->
<form method="POST" action="?/saveChecks" class="mt-6 space-y-8">
  <input type="hidden" name="__noscript" value="1" />

  {#each SECTIONS as section (section.id)}
    {@const visibleItems = section.items.filter((i) => itemVisible(i, config))}
    {#if visibleItems.length}
      <section aria-labelledby={`sec-${section.id}`}>
        <h2 id={`sec-${section.id}`} class="mb-3 border-l-4 border-accent pl-3 font-condensed text-xl font-bold uppercase tracking-wide">
          {section.title}
        </h2>
        <ul class="space-y-3">
          {#each visibleItems as item (item.id)}
            {@const key = itemKey(section.id, item.id)}
            {@const note = getDynamicNote(item, config)}
            {@const linked = linkedParts[partLinks[key]]}
            <li class="rounded-lg border border-border bg-surface p-4">
              <label class="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="checked"
                  value={key}
                  checked={checked.has(key)}
                  onchange={() => mounted && toggleCheck(key)}
                  class="mt-1 h-5 w-5 shrink-0 rounded border-border bg-surface-2"
                />
                <span>
                  <span class="font-condensed text-lg font-semibold {checked.has(key) ? 'text-ink-muted line-through' : ''}">
                    {getTitle(item, config)}
                  </span>
                  {#if note}<span class="mt-1 block text-sm text-ink-muted">{note}</span>{/if}
                </span>
              </label>

              {#if hasPicker(key)}
                <!-- Inventory reference panel uses the app card style (§9.6). -->
                <div class="mt-3 rounded-md border border-border bg-surface-2 p-3 text-sm">
                  {#if linked}
                    <p class="text-xs uppercase tracking-wide text-ink-muted">{getLabel(linked.type_id)}</p>
                    <p class="font-medium">{linked.title}</p>
                    <p class="mt-1 flex items-center gap-1 text-ink-muted">
                      <MapPin size={14} aria-hidden="true" /> {linkStatus(linked)}
                    </p>
                    <div class="mt-2 flex flex-wrap gap-3">
                      <a href={`/bikes/${bikeId}/checklist/link-part?item=${encodeURIComponent(key)}`} class="text-accent underline">Change</a>
                      <!-- formaction overrides the enclosing form's action, so no
                           nested <form> is needed (invalid HTML). -->
                      <button type="submit" formaction="?/unlinkPart" name="key" value={key} class="text-ink-muted underline">
                        Unlink
                      </button>
                    </div>
                  {:else}
                    <a
                      href={`/bikes/${bikeId}/checklist/link-part?item=${encodeURIComponent(key)}`}
                      class="inline-flex items-center gap-1 text-accent underline"
                    >
                      <Link2 size={14} aria-hidden="true" /> Link a part
                    </a>
                  {/if}
                </div>
              {/if}
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  {/each}

  {#if !mounted}
    <button type="submit" class="min-h-[44px] rounded-md bg-accent px-8 py-2 font-semibold text-accent-ink">
      <Check size={18} class="mr-1 inline" aria-hidden="true" /> Save progress
    </button>
  {/if}
</form>

<p class="mt-8 text-sm text-ink-muted">
  Missing a part? <a href="/parts/new" class="text-accent underline inline-flex items-center gap-1"><Plus size={14} aria-hidden="true" /> Add a part</a>
</p>
