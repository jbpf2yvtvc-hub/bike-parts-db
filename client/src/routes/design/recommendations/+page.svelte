<script lang="ts">
  import { recommendations } from '../_lib/system';
  import { CheckCircle2 } from '@lucide/svelte';

  const order = { high: 0, medium: 1, low: 2 } as const;
  const sorted = [...recommendations].sort((a, b) => order[a.severity] - order[b.severity]);

  const sevCls: Record<string, string> = {
    high: 'text-danger-fg border-danger-fg/40',
    medium: 'text-for-sale border-for-sale/40',
    low: 'text-ink-muted border-border'
  };
</script>

<section>
  <h2 class="font-display text-xl font-semibold text-ink">Gaps &amp; recommendations</h2>
  <p class="mb-4 text-sm text-ink-muted">
    Where the live app diverged from the idealized system. <strong class="text-ink">All of these have
    now been applied</strong> — this page is kept as the record of what changed and why.
  </p>

  <p class="mb-6 flex items-center gap-2 rounded-md border border-keep/40 bg-keep/10 p-3 text-sm text-keep">
    <CheckCircle2 size={16} aria-hidden="true" />
    {recommendations.length} of {recommendations.length} resolved.
  </p>

  <ol class="space-y-4">
    {#each sorted as r, i (r.title)}
      <li class="rounded-lg border border-border bg-surface p-4">
        <div class="flex items-start justify-between gap-3">
          <h3 class="flex items-center gap-2 font-condensed text-lg font-semibold text-ink">
            <span class="text-ink-muted">{i + 1}.</span>
            {r.title}
          </h3>
          <span class="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium uppercase tracking-wide {sevCls[r.severity]}">
            {r.severity}
          </span>
        </div>
        <p class="mt-2 text-sm text-ink-muted">
          <span class="font-semibold text-ink">Problem.</span> {r.problem}
        </p>
        <p class="mt-1 text-sm text-ink-muted">
          <span class="font-semibold text-ink">Suggestion.</span> {r.suggestion}
        </p>
        <p class="mt-2 flex items-start gap-1.5 text-sm text-keep">
          <CheckCircle2 size={15} class="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{r.resolution}</span>
        </p>
      </li>
    {/each}
  </ol>
</section>
