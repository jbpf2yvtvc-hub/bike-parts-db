<script lang="ts">
  import { enhance } from '$app/forms';

  let {
    values = {},
    errors = {},
    submitLabel = 'Save'
  }: {
    values?: Record<string, any>;
    errors?: Record<string, string>;
    submitLabel?: string;
  } = $props();

  const input = 'mt-1 block w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 py-2';
</script>

<form method="POST" use:enhance class="space-y-4">
  <div>
    <label for="name" class="block font-medium">Name <span class="text-red-400">*</span></label>
    <input id="name" name="name" required value={values.name ?? ''} aria-describedby="name-error" class={input} />
    {#if errors.name}<p id="name-error" class="mt-1 text-sm text-red-400">{errors.name}</p>{/if}
  </div>
  <div class="grid grid-cols-2 gap-4">
    <div>
      <label for="make" class="block font-medium">Make</label>
      <input id="make" name="make" value={values.make ?? ''} class={input} />
    </div>
    <div>
      <label for="model" class="block font-medium">Model</label>
      <input id="model" name="model" value={values.model ?? ''} class={input} />
    </div>
  </div>
  <div class="grid grid-cols-2 gap-4">
    <div>
      <label for="year" class="block font-medium">Year</label>
      <input id="year" name="year" type="number" inputmode="numeric" value={values.year ?? ''} class={input} />
    </div>
    <div>
      <label for="color" class="block font-medium">Color</label>
      <input id="color" name="color" value={values.color ?? ''} class={input} />
    </div>
  </div>
  <div>
    <label for="notes" class="block font-medium">Notes</label>
    <textarea id="notes" name="notes" rows="3" class={input}>{values.notes ?? ''}</textarea>
  </div>
  <label class="flex min-h-[44px] items-center gap-3">
    <input type="checkbox" name="is_active" checked={!!values.is_active} class="h-5 w-5 rounded border-border bg-surface-2" />
    <span class="font-medium">Currently ridden (active)</span>
  </label>

  <div class="pt-2">
    <button type="submit" class="min-h-[44px] w-full rounded-md bg-accent px-4 py-2 font-semibold text-accent-ink sm:w-auto sm:px-8">
      {submitLabel}
    </button>
  </div>
</form>
