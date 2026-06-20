<script lang="ts">
  import Specimen from '../_lib/Specimen.svelte';
  import DispositionBadge from '$lib/components/DispositionBadge.svelte';
  import PartCard from '$lib/components/PartCard.svelte';
  import BikeCard from '$lib/components/BikeCard.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import DeleteConfirm from '$lib/components/DeleteConfirm.svelte';
  import SwitchConfirm from '$lib/components/SwitchConfirm.svelte';
  import { DISPOSITIONS } from '$lib/types';
  import type { PartRecord, BikeRecord } from '$lib/types';
  import type { FieldDef } from '$lib/schema-utils';
  import { buttonVariants } from '../_lib/system';

  // ---- Mock fixtures (typed; mirror real record shapes) -------------------
  const bikes: BikeRecord[] = [
    { id: 'b1', owner: 'demo', name: 'Red Commuter', make: 'Surly', model: 'Cross-Check', year: 2019, is_active: true },
    { id: 'b2', owner: 'demo', name: 'Gravel Build', make: 'Kona', model: 'Rove', year: 2021 }
  ];

  const seatpost: PartRecord = {
    id: 'demo-1', owner: 'demo', type_id: 'seatpost',
    attributes: { brand: 'Thomson', model: 'Elite', diameter_mm: 27.2, length_mm: 330, setback_mm: 16, color: 'Black' },
    quantity: 2, disposition: 'keep', expand: { bikes: [bikes[0]] }
  };
  const stem: PartRecord = {
    id: 'demo-2', owner: 'demo', type_id: 'stem',
    attributes: { brand: 'Ritchey', model: 'WCS', length_mm: 100, clamp_diameter: '31.8mm', angle_deg: 6, color: 'Silver' },
    quantity: 1, disposition: 'for_sale'
  };
  const wheel: PartRecord = {
    id: 'demo-3', owner: 'demo', type_id: 'wheel',
    attributes: { brand: 'DT Swiss', model: 'P1800', position: 'rear', wheel_size: '700c', brake_type: 'disc', freehub_standard: 'Shimano HG' },
    quantity: 1, disposition: 'unknown'
  };

  // ---- Field definitions for the FormField gallery ------------------------
  const textField: FieldDef = { id: 'brand', label: 'Brand', type: 'text', hint: 'Manufacturer name', autocomplete: 'off' };
  const numberField: FieldDef = { id: 'diameter_mm', label: 'Diameter (mm)', type: 'number', inputmode: 'decimal', required: true };
  const selectField: FieldDef = { id: 'material', label: 'Material', type: 'select', options: ['aluminum', 'steel', 'carbon', 'titanium'] };
  const textareaField: FieldDef = { id: 'notes', label: 'Notes', type: 'textarea' };
  const boolField: FieldDef = { id: 'dropper', label: 'Dropper post', type: 'boolean' };
  const errorField: FieldDef = { id: 'length_mm', label: 'Length (mm)', type: 'number', required: true };
</script>

<!-- BUTTONS ---------------------------------------------------------------->
<section class="mb-10">
  <h2 class="font-display text-xl font-semibold text-ink">Buttons</h2>
  <p class="mb-4 text-sm text-ink-muted">
    One recipe for the 44px target, layout, and radius; four intents. The shared hover/focus
    brightness applies automatically. Works on <code class="text-ink">&lt;button&gt;</code> and
    <code class="text-ink">&lt;a class="btn …"&gt;</code>. Tab through to see focus.
  </p>
  <Specimen title="Variants" interactive>
    <div class="flex flex-wrap items-center gap-3">
      {#each buttonVariants as b (b.cls)}
        <button type="button" class={b.cls}>{b.label}</button>
      {/each}
    </div>
    <dl class="mt-4 space-y-1 text-sm text-ink-muted">
      {#each buttonVariants as b (b.cls)}
        <div class="flex gap-2">
          <dt class="font-mono text-ink">{b.cls}</dt>
          <dd>— {b.usage}</dd>
        </div>
      {/each}
    </dl>
  </Specimen>
</section>

<!-- DISPOSITION BADGE ------------------------------------------------------>
<section class="mb-10">
  <h2 class="font-display text-xl font-semibold text-ink">DispositionBadge</h2>
  <p class="mb-4 text-sm text-ink-muted">Status pill — icon + text + color, never color alone. One per disposition.</p>
  <Specimen title="All states">
    <div class="flex flex-wrap gap-3">
      {#each DISPOSITIONS as d (d.value)}
        <DispositionBadge disposition={d.value} />
      {/each}
    </div>
  </Specimen>
</section>

<!-- PART CARD -------------------------------------------------------------->
<section class="mb-10">
  <h2 class="font-display text-xl font-semibold text-ink">PartCard</h2>
  <p class="mb-4 text-sm text-ink-muted">
    Inventory tile. Shows brand/model, per-type differentiating specs, quantity, disposition, and the
    bikes it's installed on.
  </p>
  <Specimen title="Variants" description="Seatpost (qty 2, on a bike), stem (for sale), wheel (unknown).">
    <div class="grid gap-3 sm:grid-cols-2">
      <PartCard part={seatpost} />
      <PartCard part={stem} />
      <PartCard part={wheel} />
    </div>
  </Specimen>
</section>

<!-- BIKE CARD -------------------------------------------------------------->
<section class="mb-10">
  <h2 class="font-display text-xl font-semibold text-ink">BikeCard</h2>
  <p class="mb-4 text-sm text-ink-muted">Bike tile with an optional “Active” status.</p>
  <Specimen title="Active and inactive">
    <div class="grid gap-3 sm:grid-cols-2">
      <BikeCard bike={bikes[0]} />
      <BikeCard bike={bikes[1]} />
    </div>
  </Specimen>
</section>

<!-- FORM FIELD ------------------------------------------------------------->
<section class="mb-10">
  <h2 class="font-display text-xl font-semibold text-ink">FormField</h2>
  <p class="mb-4 text-sm text-ink-muted">
    Schema-driven field: label above, correct input type, <code class="text-ink">aria-describedby</code>
    hint, and inline error. 44px min target.
  </p>
  <Specimen title="Field types" interactive>
    <div class="max-w-md">
      <FormField field={textField} value="Thomson" />
      <FormField field={numberField} />
      <FormField field={selectField} value="carbon" />
      <FormField field={boolField} value={true} />
      <FormField field={textareaField} />
    </div>
  </Specimen>
  <div class="mt-3">
    <Specimen title="Error state" description="Invalid value with a text error tied to the field." interactive>
      <div class="max-w-md">
        <FormField field={errorField} value="" error="Length is required." />
      </div>
    </Specimen>
  </div>
</section>

<!-- DESTRUCTIVE / CONFIRM DIALOGS ------------------------------------------>
<section class="mb-10">
  <h2 class="font-display text-xl font-semibold text-ink">DeleteConfirm</h2>
  <p class="mb-4 text-sm text-ink-muted">
    Two-step destructive action. No-JS: the trigger links to a confirm page. With JS: it opens a Melt UI
    alertdialog wrapping the same action. Click to try it.
  </p>
  <Specimen title="Trigger + dialog" interactive>
    <DeleteConfirm
      confirmHref="#"
      action="#"
      label="Delete part"
      title="Delete this seatpost?"
      message="This removes the part from your inventory. This cannot be undone."
    />
  </Specimen>
</section>

<section class="mb-10">
  <h2 class="font-display text-xl font-semibold text-ink">SwitchConfirm</h2>
  <p class="mb-4 text-sm text-ink-muted">
    Shown when a fully-assigned part is linked to another bike — confirms moving one unit, with a chooser
    when it's on several bikes.
  </p>
  <Specimen title="Trigger + dialog (multi-bike)" interactive>
    <SwitchConfirm
      confirmHref="#"
      action="#"
      item="stem::stem-threadless"
      partId="demo-2"
      partTitle="Ritchey WCS"
      thisBikeName="Gravel Build"
      otherBikes={[{ id: 'b1', name: 'Red Commuter' }, { id: 'b3', name: 'Townie' }]}
    />
  </Specimen>
</section>
