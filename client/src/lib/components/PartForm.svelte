<script lang="ts">
  import { enhance } from '$app/forms';
  import { onMount, untrack } from 'svelte';
  import FormField from './FormField.svelte';
  import DispositionBadge from './DispositionBadge.svelte';
  import { DISPOSITIONS } from '$lib/types';
  import type { Disposition } from '$lib/types';
  import type { FieldDef, PartSchema } from '$lib/schema-utils';

  interface AssocOption {
    role: string;
    label: string;
    targetType: string;
    multiple: boolean;
    hint?: string;
    candidates: { id: string; title: string }[];
    selected: string[];
  }

  let {
    schema,
    bikes = [],
    assocOptions = [],
    attributes = {},
    meta = {},
    errors = {},
    submitLabel = 'Save'
  }: {
    schema: PartSchema;
    bikes?: { id: string; name: string }[];
    assocOptions?: AssocOption[];
    attributes?: Record<string, unknown>;
    meta?: Record<string, any>;
    errors?: Record<string, string>;
    submitLabel?: string;
  } = $props();

  // Selected associations by role. Prefer resubmitted values (meta.associations)
  // over the stored selection carried on each option.
  function initialSelected(o: AssocOption): string[] {
    const fromMeta = meta?.associations?.[o.role];
    if (Array.isArray(fromMeta)) return fromMeta.map(String);
    return o.selected ?? [];
  }

  const input = 'mt-1 block w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 py-2';

  // Quantity + per-bike assignment. A part with quantity N can place up to N
  // units total, and more than one on the same bike (e.g. two `either` brakes
  // on one bike). Each bike gets a unit count, capped by what's still available.
  let quantity = $state(untrack(() => Math.max(1, Number(meta.quantity) || 1)));
  let counts = $state<Record<string, number>>(
    untrack(() => {
      const seed: Record<string, number> = {};
      const q = meta.bike_qty;
      if (q && typeof q === 'object') {
        for (const [id, n] of Object.entries(q)) {
          const v = Math.floor(Number(n));
          if (id && Number.isFinite(v) && v > 0) seed[id] = v;
        }
      } else if (Array.isArray(meta.bikes)) {
        for (const id of meta.bikes) seed[id] = (seed[id] ?? 0) + 1;
      }
      return seed;
    })
  );

  const assigned = $derived(Object.values(counts).reduce((a, b) => a + b, 0));
  const available = $derived(Math.max(0, quantity - assigned));

  function setCount(id: string, n: number) {
    const next = { ...counts };
    const v = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
    if (v > 0) next[id] = v;
    else delete next[id];
    counts = next;
  }

  // Conditional fields (showWhen): reactive with JS, always shown with no JS.
  let mounted = $state(false);
  onMount(() => (mounted = true));
  const liveValues = $state<Record<string, unknown>>(untrack(() => ({ ...attributes })));

  // Mirror the selected disposition so its status pill updates live.
  let disposition = $state<Disposition>(untrack(() => (meta.disposition ?? 'unknown') as Disposition));

  function onFieldInput(e: Event) {
    const el = e.target as HTMLInputElement | HTMLSelectElement | null;
    if (el?.name?.startsWith('attr.')) liveValues[el.name.slice('attr.'.length)] = el.value;
  }

  function fieldShown(field: FieldDef): boolean {
    if (!field.showWhen) return true;
    if (!mounted) return true; // no-JS: always show conditional fields
    return field.showWhen.in.includes(String(liveValues[field.showWhen.field] ?? ''));
  }
</script>

<form method="POST" use:enhance oninput={onFieldInput} class="space-y-2">
  <input type="hidden" name="type_id" value={schema.type_id} />

  {#each schema.fields as field (field.id)}
    {#if fieldShown(field)}
      <FormField {field} value={attributes[field.id]} error={errors[field.id]} />
    {/if}
  {/each}

  {#if assocOptions.length}
    <fieldset class="mt-6 space-y-4 border-t border-border pt-6">
      <legend class="font-condensed text-lg font-semibold">Associated parts</legend>
      {#each assocOptions as o (o.role)}
        {@const sel = initialSelected(o)}
        <div>
          <span class="block font-medium">{o.label}</span>
          {#if o.hint}<p class="mt-1 text-sm text-ink-muted">{o.hint}</p>{/if}
          {#if o.candidates.length === 0}
            <p class="mt-1 text-sm text-ink-muted">
              No {o.label.toLowerCase()} in your inventory yet —
              <a href={`/parts/new?type=${o.targetType}`} class="text-accent underline">add one</a> first.
            </p>
          {:else if o.multiple}
            <div class="mt-2 space-y-1">
              {#each o.candidates as c (c.id)}
                <label class="flex min-h-[44px] items-center gap-2">
                  <input
                    type="checkbox"
                    name={`assoc.${o.role}`}
                    value={c.id}
                    checked={sel.includes(c.id)}
                    class="h-5 w-5 rounded border-border bg-surface-2"
                  />
                  <span>{c.title}</span>
                </label>
              {/each}
            </div>
          {:else}
            <select name={`assoc.${o.role}`} class={input}>
              <option value="">— none —</option>
              {#each o.candidates as c (c.id)}
                <option value={c.id} selected={sel.includes(c.id)}>{c.title}</option>
              {/each}
            </select>
          {/if}
        </div>
      {/each}
    </fieldset>
  {/if}

  <fieldset class="mt-6 space-y-4 border-t border-border pt-6">
    <legend class="font-condensed text-lg font-semibold">Inventory details</legend>

    <div>
      <div class="flex items-center gap-2">
        <label for="disposition" class="block font-medium">Disposition</label>
        <DispositionBadge {disposition} />
      </div>
      <select id="disposition" name="disposition" bind:value={disposition} class={input}>
        {#each DISPOSITIONS as d (d.value)}
          <option value={d.value}>{d.label}</option>
        {/each}
      </select>
    </div>

    <div>
      <label for="quantity" class="block font-medium">Quantity</label>
      <input id="quantity" name="quantity" type="number" inputmode="numeric" min="1" step="1"
        bind:value={quantity} aria-describedby="quantity-hint" class={input} />
      <p id="quantity-hint" class="mt-1 text-sm text-ink-muted">How many of this part you own.</p>
    </div>

    <fieldset>
      <legend class="block font-medium">On bike(s)</legend>
      <p class="mt-1 text-sm text-ink-muted">
        Assign units across your bikes — up to {quantity} total ({available} still available).
        More than one can go on the same bike.
      </p>
      {#if errors.bikes}
        <p class="mt-1 text-sm text-danger-fg">{errors.bikes}</p>
      {/if}
      {#if bikes.length}
        <div class="mt-2 space-y-1">
          {#each bikes as b (b.id)}
            {@const count = counts[b.id] ?? 0}
            <label class="flex min-h-[44px] items-center justify-between gap-2">
              <span>{b.name}<span class="sr-only"> — units of this part on this bike</span></span>
              <input
                type="number"
                inputmode="numeric"
                name={`bike_qty.${b.id}`}
                min="0"
                max={count + available}
                step="1"
                value={count}
                onchange={(e) => setCount(b.id, Number(e.currentTarget.value))}
                class="w-20 min-h-[44px] rounded-md border border-border bg-surface-2 px-3 py-2 text-right"
              />
            </label>
          {/each}
        </div>
      {:else}
        <p class="mt-2 text-sm text-ink-muted">You have no bikes yet.</p>
      {/if}
    </fieldset>

    <div>
      <label for="acquisition_date" class="block font-medium">Acquisition date</label>
      <input id="acquisition_date" name="acquisition_date" type="date" value={meta.acquisition_date ?? ''} class={input} />
    </div>

    <div>
      <label for="acquisition_price" class="block font-medium">Acquisition price</label>
      <input id="acquisition_price" name="acquisition_price" type="number" inputmode="decimal" step="0.01"
        value={meta.acquisition_price ?? ''} class={input} />
    </div>

    <div>
      <label for="asking_price" class="block font-medium">Asking price</label>
      <input id="asking_price" name="asking_price" type="number" inputmode="decimal" step="0.01"
        value={meta.asking_price ?? ''} aria-describedby="asking-hint" class={input} />
      <p id="asking-hint" class="mt-1 text-sm text-ink-muted">Relevant when the disposition is “For sale”.</p>
    </div>
  </fieldset>

  <div class="pt-4">
    <button type="submit" class="btn btn-primary w-full sm:w-auto sm:px-8">
      {submitLabel}
    </button>
  </div>
</form>
