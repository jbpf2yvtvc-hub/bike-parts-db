<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { beforeNavigate } from '$app/navigation';
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
  import { TriangleAlert, Link2, MapPin, Plus, Check, ChevronDown, StickyNote } from '@lucide/svelte';

  type ViewFilter = 'all' | 'installed' | 'needed';

  let { data }: { data: any } = $props();

  // Seed local state from the server load (intentionally initial-only).
  let config = $state<ChecklistConfig>(untrack(() => ({ ...data.config })));
  let checked = $state(new Set<string>(untrack(() => data.checkedItems)));
  let notes = $state<string>(untrack(() => data.notes ?? ''));
  let view = $state<ViewFilter>(untrack(() => data.view));
  let mounted = $state(false);
  onMount(() => (mounted = true));

  const bikeId = untrack(() => data.bike.id);
  // Effective per-item links (manual + parts auto-linked because they're
  // installed on this bike); keyed by item key.
  const links = $derived(data.links as Record<string, any>);
  // Visibility context (e.g. whether the frame has an integrated seatpost clamp).
  const ctx = $derived(data.ctx as { frameIntegratedClamp?: boolean });

  // A linked part auto-checks its item, so an item counts as done ("installed")
  // when it is either manually checked or has a linked part.
  const isLinked = (key: string): boolean => !!links[key];
  const isDone = (key: string): boolean => checked.has(key) || isLinked(key);

  // View filter: All / Installed (done) / Needed (not done).
  const matchesView = (key: string): boolean =>
    view === 'all' ? true : view === 'installed' ? isDone(key) : !isDone(key);

  const subtitle = $derived(buildSubtitle(config));
  const warnings = $derived(getConfigWarnings(config));
  const visKeys = $derived(visibleItemKeys(config, ctx));
  const total = $derived(visKeys.length);
  const done = $derived(visKeys.filter(isDone).length);
  const pct = $derived(total ? Math.round((done / total) * 100) : 0);
  const shownCount = $derived(visKeys.filter(matchesView).length);

  const FILTERS: { value: ViewFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'installed', label: 'Installed' },
    { value: 'needed', label: 'Needed' }
  ];

  function selectView(e: MouseEvent, value: ViewFilter) {
    // JS: filter in place. No-JS: the <a href> reloads with ?view=… and the
    // server renders the filtered view.
    if (!mounted) return;
    e.preventDefault();
    view = value;
  }

  // --- JS enhancement: debounced persistence (§9.1, step 17) -----------------
  // Each change is saved on a short debounce. The saver is also stashed in
  // `pendingSaves` so a not-yet-fired save can be flushed before we leave the
  // page (below) rather than silently dropped — e.g. toggling the stem
  // converter and immediately clicking "Link a part". `keepalive` lets a save
  // that fires mid-navigation (or on unload) still reach the server.
  let cfgTimer: ReturnType<typeof setTimeout>;
  let chkTimer: ReturnType<typeof setTimeout>;
  let notesTimer: ReturnType<typeof setTimeout>;
  const pendingSaves = new Set<() => void>();

  // Stable savers — they read the latest reactive state at call time, so they
  // send current values whether fired by the debounce or by a flush.
  function saveConfig() {
    // Absolute path — a relative 'config' would resolve to /bikes/<id>/config
    // (the page has no trailing slash) and silently 404, losing the config.
    void fetch(`/bikes/${bikeId}/checklist/config`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(config),
      keepalive: true
    });
  }
  function saveChecks() {
    const fd = new FormData();
    for (const k of checked) fd.append('checked', k);
    void fetch(`/bikes/${bikeId}/checklist?/saveChecks`, { method: 'POST', body: fd, keepalive: true });
  }
  function saveNotes() {
    const fd = new FormData();
    fd.append('notes', notes);
    void fetch(`/bikes/${bikeId}/checklist?/saveNotes`, { method: 'POST', body: fd, keepalive: true });
  }

  // Debounce a saver: cancel the prior timer, mark it pending, and fire after
  // `delay`. A stable saver reference means re-triggering the same type just
  // resets its single pending entry rather than queuing duplicates.
  function debounce(
    timer: ReturnType<typeof setTimeout>,
    save: () => void,
    delay: number
  ): ReturnType<typeof setTimeout> {
    clearTimeout(timer);
    pendingSaves.add(save);
    return setTimeout(() => {
      pendingSaves.delete(save);
      save();
    }, delay);
  }

  function onConfigChange() {
    // Mirror the server-side normalisation: tension only applies to 1-speed,
    // and a stem converter only to a threaded steerer.
    if (config.rear_speeds !== '1') config.tension = 'horizontal';
    if (config.fork !== 'threaded') config.stem_converter = false;
    cfgTimer = debounce(cfgTimer, saveConfig, 350);
  }

  function toggleCheck(key: string) {
    // Optimistic local update, then debounce-save the full set.
    const next = new Set(checked);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    checked = next;
    chkTimer = debounce(chkTimer, saveChecks, 400);
  }

  function onNotesChange() {
    // Optimistic local state is already bound; debounce-save the text.
    notesTimer = debounce(notesTimer, saveNotes, 500);
  }

  // Flush any pending save before leaving the page (SvelteKit navigation, a
  // full reload, or closing the tab — beforeNavigate covers all three), so a
  // change made within the debounce window isn't lost on the way out.
  function flushPendingSaves() {
    clearTimeout(cfgTimer);
    clearTimeout(chkTimer);
    clearTimeout(notesTimer);
    for (const save of pendingSaves) save();
    pendingSaves.clear();
  }
  beforeNavigate(flushPendingSaves);

  function linkStatus(p: any): string {
    if (!p) return '';
    const qty = p.quantity > 1 ? ` · qty ${p.quantity}` : '';
    if (p.onThisBike) return `On this bike ✓${qty}`;
    if (p.otherBikeNames?.length) return `📍 On: ${p.otherBikeNames.join(', ')}${qty}`;
    return `In inventory · not on a bike${qty}`;
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
  <a href="#notes" class="mt-1 inline-flex items-center gap-1 text-sm text-accent underline">
    <StickyNote size={14} aria-hidden="true" /> Build notes
  </a>
</header>

<!-- Sticky configurator bar with yellow bottom border (§9.6). -->
<div class="sticky top-0 z-30 -mx-4 border-b-2 border-accent bg-ground/95 px-4 py-3 backdrop-blur">
  <form
    id="configurator"
    method="POST"
    action={`/bikes/${bikeId}/checklist/config`}
    onsubmit={(e) => mounted && e.preventDefault()}
  >
    <fieldset>
      <legend class="sr-only">Build configuration</legend>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
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
            <option value="cruiser">cruiser/multi-position</option>
            <option value="alt">alt bars</option>
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

<!-- View filter: All / Installed / Needed (§9 update). No-JS: links reload
     with ?view=…; JS: filters in place. -->
<div class="mt-6 inline-flex rounded-md border border-border bg-surface p-1" role="group" aria-label="Filter checklist items">
  {#each FILTERS as f (f.value)}
    {@const count = f.value === 'all' ? total : f.value === 'installed' ? done : total - done}
    <a
      href={f.value === 'all' ? '?' : `?view=${f.value}`}
      onclick={(e) => selectView(e, f.value)}
      aria-current={view === f.value ? 'true' : undefined}
      class="btn min-h-[44px] rounded px-4 py-2 text-sm font-medium {view === f.value
        ? 'bg-accent text-accent-ink'
        : 'text-ink-muted hover:text-ink'}"
    >
      {f.label} <span class="opacity-70">({count})</span>
    </a>
  {/each}
</div>

<!-- The checklist itself is one form so it works with no JS (Save button). -->
<form method="POST" action="?/saveChecks" class="mt-4 space-y-4">
  <input type="hidden" name="__noscript" value="1" />
  <input type="hidden" name="view" value={view} />

  {#each SECTIONS as section (section.id)}
    {@const visibleItems = section.items.filter((i) => itemVisible(i, config, ctx))}
    {@const shownItems = visibleItems.filter((i) => matchesView(itemKey(section.id, i.id)))}
    {@const secDone = visibleItems.filter((i) => isDone(itemKey(section.id, i.id))).length}
    {#if shownItems.length}
      <!-- Collapsible section (native <details>; works with no JS). -->
      <details open class="overflow-hidden rounded-lg border border-border bg-surface">
        <summary class="flex items-center justify-between gap-2 border-l-4 border-accent py-3 pl-3 pr-4">
          <span class="flex items-center gap-2">
            <ChevronDown size={18} class="chevron shrink-0 text-ink-muted transition-transform" aria-hidden="true" />
            <h2 class="text-xl font-bold uppercase tracking-wide">{section.title}</h2>
          </span>
          <span class="text-xs text-ink-muted">{secDone}/{visibleItems.length}</span>
        </summary>
        <ul class="space-y-3 p-4">
          {#each shownItems as item (item.id)}
            {@const key = itemKey(section.id, item.id)}
            {@const note = getDynamicNote(item, config)}
            {@const linked = links[key]}
            {@const linkNoteId = key.replace('::', '--') + '-linknote'}
            <li class="rounded-lg border border-border bg-surface p-4">
              <label class="flex items-start gap-3">
                <!-- A linked part auto-checks the item; the checkbox is then
                     checked + disabled until the part is unlinked. -->
                <input
                  type="checkbox"
                  name="checked"
                  value={key}
                  checked={checked.has(key) || !!linked}
                  disabled={!!linked}
                  aria-describedby={linked ? linkNoteId : undefined}
                  onchange={() => mounted && toggleCheck(key)}
                  class="mt-1 h-5 w-5 shrink-0 rounded border-border bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <span>
                  <span class="font-condensed text-lg font-semibold {checked.has(key) || linked ? 'text-ink-muted line-through' : ''}">
                    {getTitle(item, config)}
                  </span>
                  {#if linked}
                    <span id={linkNoteId} class="mt-1 block text-xs text-ink-muted">
                      {linked.source === 'bike'
                        ? 'Auto-checked — this part is installed on this bike.'
                        : 'Auto-checked — a part is linked. Unlink it to edit this item.'}
                    </span>
                  {/if}
                  {#if note}<span class="mt-1 block text-sm text-ink-muted">{note}</span>{/if}
                </span>
              </label>

              <!-- Shifter type. Friction relaxes derailleur matching to
                   "supports at least N speeds". The selects belong to the
                   configurator form (form="configurator") so they persist with
                   the rest of the config, with no JS too. -->
              {#if key === 'drivetrain::left-shifter'}
                <label class="mt-3 flex items-center gap-2 text-sm">
                  <span class="text-ink-muted">Front shifting</span>
                  <select
                    form="configurator"
                    name="front_shifting"
                    bind:value={config.front_shifting}
                    onchange={onConfigChange}
                    class="min-h-[36px] rounded border border-border bg-surface-2 px-2"
                  >
                    <option value="indexed">indexed</option>
                    <option value="friction">friction</option>
                  </select>
                </label>
              {:else if key === 'drivetrain::right-shifter' && config.rear_speeds !== '1'}
                <label class="mt-3 flex items-center gap-2 text-sm">
                  <span class="text-ink-muted">Rear shifting</span>
                  <select
                    form="configurator"
                    name="rear_shifting"
                    bind:value={config.rear_shifting}
                    onchange={onConfigChange}
                    class="min-h-[36px] rounded border border-border bg-surface-2 px-2"
                  >
                    <option value="indexed">indexed</option>
                    <option value="friction">friction</option>
                  </select>
                </label>
              {:else if key === 'stem::stem-quill'}
                <!-- Threaded steerer: a stem converter lets threadless stems be
                     linked. Belongs to the configurator form so it persists. -->
                <label class="mt-3 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    form="configurator"
                    name="stem_converter"
                    bind:checked={config.stem_converter}
                    onchange={onConfigChange}
                    class="h-4 w-4 rounded border-border bg-surface-2"
                  />
                  <span class="text-ink-muted">Use a stem converter (allow threadless stems)</span>
                </label>
              {/if}

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
                      <!-- "Change" picks a different part for THIS slot (an
                           override) — e.g. a separate shifter while a brifter
                           stays in the lever slot. -->
                      <a href={`/bikes/${bikeId}/checklist/link-part?item=${encodeURIComponent(key)}`} class="text-accent underline">Change</a>
                      <a href={`/parts/${linked.id}`} class="text-ink-muted underline">View part</a>
                      <!-- formaction overrides the enclosing form's action, so no
                           nested <form> is needed (invalid HTML). Removes the part
                           from this bike (and all its slots here). -->
                      <button type="submit" formaction="?/removeFromBike" name="partId" value={linked.id} class="text-ink-muted underline">
                        Remove from bike
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
      </details>
    {/if}
  {/each}

  <!-- Preserve checked items that the active view filter hides, so a no-JS
       Save doesn't drop them (a non-rendered checkbox can't submit). -->
  {#each visKeys as k (k)}
    {#if checked.has(k) && !matchesView(k)}
      <input type="hidden" name="checked" value={k} />
    {/if}
  {/each}

  {#if !shownCount}
    <p class="rounded-lg border border-border bg-surface p-6 text-center text-ink-muted">
      {view === 'needed'
        ? 'Nothing needed — every visible item is installed. 🎉'
        : view === 'installed'
          ? 'No installed items yet — link a part or check items off.'
          : 'No items for this configuration.'}
    </p>
  {/if}

  {#if !mounted}
    <button type="submit" class="min-h-[44px] rounded-md bg-accent px-8 py-2 font-semibold text-accent-ink">
      <Check size={18} class="mr-1 inline" aria-hidden="true" /> Save progress
    </button>
  {/if}
</form>

<!-- Build notes: free-text details that don't belong in the parts inventory
     (specific cable ends, which housing, etc.). Own form so no-JS Save works;
     JS debounce-autosaves on input. -->
<section id="notes" class="mt-8 scroll-mt-24 overflow-hidden rounded-lg border border-border bg-surface">
  <div class="flex items-center gap-2 border-l-4 border-accent py-3 pl-3 pr-4">
    <StickyNote size={18} class="shrink-0 text-ink-muted" aria-hidden="true" />
    <h2 class="text-xl font-bold uppercase tracking-wide">Notes</h2>
  </div>
  <form method="POST" action="?/saveNotes" class="p-4">
    <input type="hidden" name="__noscript" value="1" />
    <label class="block text-sm">
      <span class="text-ink-muted">
        Build-specific details — special cable ends, which housing to use, torque values, etc.
      </span>
      <textarea
        name="notes"
        rows="6"
        bind:value={notes}
        oninput={() => mounted && onNotesChange()}
        placeholder="e.g. rear shift housing: Jagwire LEX-SL; sealed cable ends on the down-tube run…"
        class="mt-2 w-full rounded border border-border bg-surface-2 px-3 py-2 font-condensed text-base"
      ></textarea>
    </label>
    {#if mounted}
      <p class="mt-2 text-xs text-ink-muted">Saved automatically.</p>
    {:else}
      <button type="submit" class="mt-3 min-h-[44px] rounded-md bg-accent px-8 py-2 font-semibold text-accent-ink">
        <Check size={18} class="mr-1 inline" aria-hidden="true" /> Save notes
      </button>
    {/if}
  </form>
</section>

<p class="mt-8 text-sm text-ink-muted">
  Missing a part? <a href="/parts/new" class="text-accent underline inline-flex items-center gap-1"><Plus size={14} aria-hidden="true" /> Add a part</a>
</p>
