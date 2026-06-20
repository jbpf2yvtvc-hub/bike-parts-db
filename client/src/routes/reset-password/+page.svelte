<script lang="ts">
  import { enhance } from '$app/forms';
  let { form } = $props();
</script>

<svelte:head><title>Reset password · Bike Parts DB</title></svelte:head>

<h2 class="mb-4 text-xl font-semibold">Reset your password</h2>

{#if form?.sent}
  <p role="status" class="rounded-md border border-keep/40 bg-keep/10 p-3 text-keep">
    If that email is registered, a reset link is on its way. Check your inbox.
  </p>
{:else}
  {#if form?.error}
    <p role="alert" class="mb-4 rounded-md border border-danger-fg/50 bg-danger-fg/10 p-3 text-danger-fg">
      {form.error}
    </p>
  {/if}
  <form method="POST" use:enhance class="space-y-4">
    <div>
      <label for="email" class="block font-medium">Email</label>
      <input id="email" name="email" type="email" autocomplete="email" required
        class="mt-1 block w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 py-2" />
    </div>
    <button type="submit" class="btn btn-primary w-full">
      Send reset link
    </button>
  </form>
{/if}

<p class="mt-4 text-sm text-ink-muted">
  <a href="/login" class="text-accent underline">Back to log in</a>
</p>
