<script lang="ts">
  import Specimen from '../_lib/Specimen.svelte';
  import Frame from '../_lib/Frame.svelte';
  import BikeForm from '$lib/components/BikeForm.svelte';
  import PartForm from '$lib/components/PartForm.svelte';
  import PartCard from '$lib/components/PartCard.svelte';
  import SideNav from '$lib/components/SideNav.svelte';
  import BottomNav from '$lib/components/BottomNav.svelte';
  import { getSchema } from '$lib/schema-utils';
  import { PackageOpen } from '@lucide/svelte';
  import type { PartRecord, BikeRecord } from '$lib/types';

  const seatpostSchema = getSchema('seatpost');

  const bikes: BikeRecord[] = [
    { id: 'b1', owner: 'demo', name: 'Red Commuter' },
    { id: 'b2', owner: 'demo', name: 'Gravel Build' }
  ];

  const parts: PartRecord[] = [
    { id: 'p1', owner: 'demo', type_id: 'seatpost', attributes: { brand: 'Thomson', model: 'Elite', diameter_mm: 27.2, length_mm: 330, color: 'Black' }, quantity: 1, disposition: 'keep' },
    { id: 'p2', owner: 'demo', type_id: 'saddle', attributes: { brand: 'Brooks', model: 'B17', width_mm: 175, color: 'Honey' }, quantity: 1, disposition: 'for_sale' }
  ];
</script>

<!-- FORMS ------------------------------------------------------------------>
<section class="mb-12">
  <h2 class="font-display text-xl font-semibold text-ink">Forms</h2>
  <p class="mb-4 text-sm text-ink-muted">
    Labels above fields, 44px targets, errors below in static text, primary action bottom-right.
    Submission is disabled in these examples.
  </p>

  <Specimen title="BikeForm" interactive>
    <div class="max-w-lg">
      <BikeForm values={{ name: 'Red Commuter', make: 'Surly', model: 'Cross-Check', year: 2019, color: 'Red' }} submitLabel="Save bike" />
    </div>
  </Specimen>

  {#if seatpostSchema}
    <div class="mt-3">
      <Specimen title="PartForm (schema-driven)" description="Rendered from the seatpost schema — fields, quantity, disposition, and bike assignment." interactive>
        <div class="max-w-lg">
          <PartForm
            schema={seatpostSchema}
            bikes={bikes}
            attributes={{ brand: 'Thomson', model: 'Elite', diameter_mm: 27.2, length_mm: 330, color: 'Black' }}
            submitLabel="Save part"
          />
        </div>
      </Specimen>
    </div>
  {/if}
</section>

<!-- CARDS GRID ------------------------------------------------------------->
<section class="mb-12">
  <h2 class="font-display text-xl font-semibold text-ink">Card grid</h2>
  <p class="mb-4 text-sm text-ink-muted">Inventory and bike lists use a single-column (mobile) → two-column (sm+) grid of cards.</p>
  <Specimen title="Parts list">
    <div class="grid gap-3 sm:grid-cols-2">
      {#each parts as p (p.id)}<PartCard part={p} />{/each}
    </div>
  </Specimen>
</section>

<!-- EMPTY STATE ------------------------------------------------------------>
<section class="mb-12">
  <h2 class="font-display text-xl font-semibold text-ink">Empty state</h2>
  <p class="mb-4 text-sm text-ink-muted">Quiet, centered, with a single clear next action.</p>
  <Specimen title="No results">
    <div class="rounded-lg border border-dashed border-border p-8 text-center">
      <PackageOpen size={28} class="mx-auto text-ink-muted" aria-hidden="true" />
      <p class="mt-2 font-condensed text-lg font-semibold text-ink">No parts yet</p>
      <p class="mt-1 text-sm text-ink-muted normal-case">Add your first component to start your inventory.</p>
      <span class="btn btn-primary mt-4">Add a part</span>
    </div>
  </Specimen>
</section>

<!-- NAVIGATION ------------------------------------------------------------->
<section>
  <h2 class="font-display text-xl font-semibold text-ink">Navigation</h2>
  <p class="mb-4 text-sm text-ink-muted">
    Bottom nav on mobile, left sidebar at <code class="text-ink">lg</code>. Both are the same items
    (max 5, 44px targets, icon + label). Shown here inside contained frames; they switch by viewport
    width, so each appears only at its breakpoint.
  </p>
  <div class="grid gap-4 sm:grid-cols-2">
    <Specimen title="BottomNav" description="Visible below the lg breakpoint.">
      <Frame height="5rem">
        <BottomNav />
      </Frame>
    </Specimen>
    <Specimen title="SideNav" description="Visible at lg and up.">
      <Frame height="16rem">
        <SideNav />
      </Frame>
    </Specimen>
  </div>
</section>
