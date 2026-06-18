<script lang="ts">
  import { enhance } from '$app/forms';
  import { untrack } from 'svelte';
  import FormField from './FormField.svelte';
  import { DISPOSITIONS } from '$lib/types';
  import type { PartSchema } from '$lib/schema-utils';

  let {
    schema,
    bikes = [],
    attributes = {},
    meta = {},
    errors = {},
    submitLabel = 'Save'
  }: {
    schema: PartSchema;
    bikes?: { id: string; name: string }[];
    attributes?: Record<string, unknown>;
    meta?: Record<string, any>;
    errors?: Record<string, string>;
    submitLabel?: string;
  } = $props();

  const input = 'mt-1 block w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 py-2';

  // Quantity + multi-bike assignment. A part can be on at most `quantity`
  // bikes (one unit each). When the cap is reached, unchecked bikes disable.
  let quantity = $state(untrack(() => Math.max(1, Number(meta.quantity) || 1)));
  let selected = $state(
    untrack(() => new Set<string>(Array.isArray(meta.bikes) ? meta.bikes : []))
  );
  const atCap = $derived(selected.size >= quantity);

  function toggleBike(id: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    selected = next;
  }
</script>

<form method="POST" use:enhance class="space-y-2">
  <input type="hidden" name="type_id" value={schema.type_id} />

  {#each schema.fields as field (field.id)}
    <FormField {field} value={attributes[field.id]} error={errors[field.id]} />
  {/each}

  <fieldset class="mt-6 space-y-4 border-t border-border pt-6">
    <legend class="font-condensed text-lg font-semibold">Inventory details</legend>

    <div>
      <label for="disposition" class="block font-medium">Disposition</label>
      <select id="disposition" name="disposition" class={input}>
        {#each DISPOSITIONS as d (d.value)}
          <option value={d.value} selected={(meta.disposition ?? 'unknown') === d.value}>{d.label}</option>
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
        Assign to up to {quantity} bike{quantity === 1 ? '' : 's'} (one per unit).
      </p>
      {#if errors.bikes}
        <p class="mt-1 text-sm text-red-400">{errors.bikes}</p>
      {/if}
      {#if bikes.length}
        <div class="mt-2 space-y-1">
          {#each bikes as b (b.id)}
            {@const isSel = selected.has(b.id)}
            <label class="flex min-h-[44px] items-center gap-2 {!isSel && atCap ? 'opacity-50' : ''}">
              <input
                type="checkbox"
                name="bikes"
                value={b.id}
                checked={isSel}
                disabled={!isSel && atCap}
                onchange={(e) => toggleBike(b.id, e.currentTarget.checked)}
                class="h-5 w-5 rounded border-border bg-surface-2 disabled:cursor-not-allowed"
              />
              <span>{b.name}</span>
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
    <button type="submit" class="min-h-[44px] w-full rounded-md bg-accent px-4 py-2 font-semibold text-accent-ink sm:w-auto sm:px-8">
      {submitLabel}
    </button>
  </div>
</form>
