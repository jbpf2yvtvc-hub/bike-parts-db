<script lang="ts">
  import { enhance } from '$app/forms';
  let { form }: { form: any } = $props();
  const v = $derived(form?.values ?? {});
  const e = $derived(form?.errors ?? {});
</script>

<svelte:head><title>Register · Bike Parts DB</title></svelte:head>

<h1 class="mb-6 font-display text-3xl tracking-wide text-accent">Bike Parts DB</h1>
<h2 class="mb-4 text-xl font-semibold">Create your account</h2>

{#if form?.error}
  <p role="alert" class="mb-4 rounded-md border border-danger-fg/50 bg-danger-fg/10 p-3 text-danger-fg">
    {form.error}
  </p>
{/if}

<form method="POST" use:enhance class="space-y-4">
  <div>
    <label for="username" class="block font-medium">Username</label>
    <input id="username" name="username" autocomplete="username" required value={v.username ?? ''}
      aria-describedby="username-hint username-error"
      class="mt-1 block w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 py-2" />
    <p id="username-hint" class="mt-1 text-sm text-ink-muted">Cannot be changed later.</p>
    {#if e.username}<p id="username-error" class="mt-1 text-sm text-danger-fg">{e.username[0]}</p>{/if}
  </div>
  <div>
    <label for="display_name" class="block font-medium">Display name</label>
    <input id="display_name" name="display_name" autocomplete="name" value={v.display_name ?? ''}
      class="mt-1 block w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 py-2" />
  </div>
  <div>
    <label for="email" class="block font-medium">Email</label>
    <input id="email" name="email" type="email" autocomplete="email" required value={v.email ?? ''}
      aria-describedby="email-error"
      class="mt-1 block w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 py-2" />
    {#if e.email}<p id="email-error" class="mt-1 text-sm text-danger-fg">{e.email[0]}</p>{/if}
  </div>
  <div>
    <label for="password" class="block font-medium">Password</label>
    <input id="password" name="password" type="password" autocomplete="new-password" required
      aria-describedby="password-error"
      class="mt-1 block w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 py-2" />
    {#if e.password}<p id="password-error" class="mt-1 text-sm text-danger-fg">{e.password[0]}</p>{/if}
  </div>
  <div>
    <label for="passwordConfirm" class="block font-medium">Confirm password</label>
    <input id="passwordConfirm" name="passwordConfirm" type="password" autocomplete="new-password" required
      aria-describedby="passwordConfirm-error"
      class="mt-1 block w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 py-2" />
    {#if e.passwordConfirm}<p id="passwordConfirm-error" class="mt-1 text-sm text-danger-fg">{e.passwordConfirm[0]}</p>{/if}
  </div>
  <button type="submit" class="btn btn-primary w-full">
    Create account
  </button>
</form>

<p class="mt-4 text-sm text-ink-muted">
  Already registered? <a href="/login" class="text-accent underline">Log in</a>
</p>
