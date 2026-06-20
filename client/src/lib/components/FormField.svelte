<script lang="ts">
  import type { FieldDef } from '$lib/schema-utils';

  let {
    field,
    value = undefined,
    error = undefined
  }: { field: FieldDef; value?: unknown; error?: string } = $props();

  const name = $derived(`attr.${field.id}`);
  const inputId = $derived(`field-${field.id}`);
  const hintId = $derived(`${inputId}-hint`);
  const errorId = $derived(`${inputId}-error`);
  const autocomplete = $derived(field.autocomplete as any);

  // aria-describedby links the hint and error to the control (§3 Understandable).
  const describedBy = $derived(
    [field.hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined
  );

  const baseInput =
    'mt-1 block w-full min-h-[44px] rounded-md border bg-surface-2 px-3 py-2 text-ink ' +
    'placeholder:text-ink-muted focus-visible:border-accent';
  const borderCls = $derived(error ? 'border-danger-fg' : 'border-border');

  const strValue = $derived(value == null ? '' : String(value));
  const arrValue = $derived(Array.isArray(value) ? (value as string[]) : []);
  const boolValue = $derived(value === true || value === 'on' || value === 'true');
</script>

<!-- Label always above the field (§4); never placeholder-only. -->
<div class="mb-4">
  {#if field.type === 'boolean'}
    <label class="flex min-h-[44px] items-center gap-3 text-ink">
      <input
        type="checkbox"
        {name}
        id={inputId}
        checked={boolValue}
        aria-describedby={describedBy}
        class="h-5 w-5 rounded border-border bg-surface-2"
      />
      <span class="font-medium">{field.label}{#if field.required}<span class="text-danger-fg"> *</span>{/if}</span>
    </label>
  {:else}
    <label for={inputId} class="block font-medium text-ink">
      {field.label}{#if field.required}<span class="text-danger-fg"> *</span>{/if}
    </label>

    {#if field.type === 'textarea'}
      <textarea
        {name}
        id={inputId}
        rows="3"
        required={field.required}
        autocomplete={autocomplete}
        aria-describedby={describedBy}
        aria-invalid={error ? 'true' : undefined}
        class="{baseInput} {borderCls}">{strValue}</textarea>
    {:else if field.type === 'select'}
      <select
        {name}
        id={inputId}
        required={field.required}
        aria-describedby={describedBy}
        aria-invalid={error ? 'true' : undefined}
        class="{baseInput} {borderCls}"
      >
        <option value="">— Select —</option>
        {#each field.options ?? [] as opt (opt)}
          <option value={opt} selected={strValue === opt}>{opt}</option>
        {/each}
      </select>
    {:else if field.type === 'multiselect'}
      <fieldset aria-describedby={describedBy} class="mt-1 space-y-1">
        <legend class="sr-only">{field.label}</legend>
        {#each field.options ?? [] as opt (opt)}
          <label class="flex min-h-[44px] items-center gap-2">
            <input
              type="checkbox"
              {name}
              value={opt}
              checked={arrValue.includes(opt)}
              class="h-5 w-5 rounded border-border bg-surface-2"
            />
            <span>{opt}</span>
          </label>
        {/each}
      </fieldset>
    {:else}
      <input
        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
        {name}
        id={inputId}
        value={strValue}
        required={field.required}
        inputmode={field.inputmode}
        step={field.type === 'number' ? (field.inputmode === 'numeric' ? '1' : 'any') : undefined}
        autocomplete={autocomplete}
        aria-describedby={describedBy}
        aria-invalid={error ? 'true' : undefined}
        class="{baseInput} {borderCls}"
      />
    {/if}
  {/if}

  {#if field.hint}
    <p id={hintId} class="mt-1 text-sm text-ink-muted">{field.hint}</p>
  {/if}
  {#if error}
    <!-- Error in text, in a static position below the field (§3, §4). -->
    <p id={errorId} class="mt-1 text-sm text-danger-fg">{error}</p>
  {/if}
</div>
