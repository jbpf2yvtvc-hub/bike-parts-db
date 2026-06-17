<script lang="ts">
  import { enhance } from '$app/forms';
  let { form } = $props();
</script>

<svelte:head><title>Log in · Bike Parts DB</title></svelte:head>

<h1 class="mb-6 font-display text-3xl tracking-wide text-accent">Bike Parts DB</h1>
<h2 class="mb-4 text-xl font-semibold">Log in</h2>

{#if form?.error}
  <p role="alert" class="mb-4 rounded-md border border-red-500/50 bg-red-500/10 p-3 text-red-300">
    {form.error}
  </p>
{/if}

<form method="POST" use:enhance class="space-y-4">
  <div>
    <label for="email" class="block font-medium">Email</label>
    <input
      id="email"
      name="email"
      type="email"
      autocomplete="email"
      required
      value={form?.email ?? ''}
      class="mt-1 block w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 py-2"
    />
  </div>
  <div>
    <label for="password" class="block font-medium">Password</label>
    <!-- Password fields allow paste; no cognitive test (SC 3.3.8). -->
    <input
      id="password"
      name="password"
      type="password"
      autocomplete="current-password"
      required
      class="mt-1 block w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 py-2"
    />
  </div>
  <button
    type="submit"
    class="min-h-[44px] w-full rounded-md bg-accent px-4 py-2 font-semibold text-accent-ink"
  >
    Log in
  </button>
</form>

<p class="mt-4 text-sm text-ink-muted">
  <a href="/reset-password" class="text-accent underline">Forgot your password?</a>
</p>
<p class="mt-2 text-sm text-ink-muted">
  No account? <a href="/register" class="text-accent underline">Register</a>
</p>
