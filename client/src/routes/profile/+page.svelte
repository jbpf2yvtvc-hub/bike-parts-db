<script lang="ts">
  import { enhance } from '$app/forms';
  import { Download, LogOut } from '@lucide/svelte';
  let { data, form }: { data: any; form: any } = $props();
  const p = $derived(data.profile);
  const input = 'mt-1 block w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 py-2';
</script>

<svelte:head><title>Profile · Bike Parts DB</title></svelte:head>

<h1 class="mb-6 font-display text-3xl tracking-wide text-accent">Profile</h1>

{#if form?.success}
  <output class="mb-4 block rounded-md border border-keep/40 bg-keep/10 p-3 text-keep">
    Profile saved.{#if form.emailChangeRequested} Check your new email to confirm the change.{/if}
  </output>
{/if}
{#if form?.error}
  <p role="alert" class="mb-4 rounded-md border border-danger-fg/50 bg-danger-fg/10 p-3 text-danger-fg">{form.error}</p>
{/if}

<form method="POST" enctype="multipart/form-data" use:enhance class="space-y-4">
  <div class="flex items-center gap-4">
    {#if p.hasAvatar}
      <img src="/profile/avatar" alt="Your current avatar" class="h-16 w-16 rounded-full object-cover" />
    {:else}
      <div class="flex h-16 w-16 items-center justify-center rounded-full bg-surface-2 text-ink-muted" aria-hidden="true">
        {p.display_name?.[0] ?? p.username?.[0] ?? '?'}
      </div>
    {/if}
    <div>
      <label for="avatar" class="block font-medium">Profile photo</label>
      <input id="avatar" name="avatar" type="file" accept="image/*" class="mt-1 text-sm" />
    </div>
  </div>

  <div>
    <label for="username" class="block font-medium">Username</label>
    <input id="username" value={p.username} readonly aria-describedby="username-hint"
      class="{input} cursor-not-allowed opacity-70" />
    <p id="username-hint" class="mt-1 text-sm text-ink-muted">Usernames cannot be changed.</p>
  </div>

  <div>
    <label for="display_name" class="block font-medium">Display name</label>
    <input id="display_name" name="display_name" autocomplete="name" value={form?.values?.display_name ?? p.display_name} class={input} />
  </div>

  <div>
    <label for="email" class="block font-medium">Email</label>
    <input id="email" name="email" type="email" autocomplete="email" value={p.email} aria-describedby="email-hint" class={input} />
    <p id="email-hint" class="mt-1 text-sm text-ink-muted">
      Changing your email requires confirming the new address.
      {#if !p.verified} Your current email is not yet verified.{/if}
    </p>
  </div>

  <div>
    <label for="bio" class="block font-medium">Bio</label>
    <textarea id="bio" name="bio" rows="3" maxlength="280" aria-describedby="bio-hint bio-error" class={input}>{p.bio}</textarea>
    <p id="bio-hint" class="mt-1 text-sm text-ink-muted">Up to 280 characters.</p>
    {#if form?.errors?.bio}<p id="bio-error" class="mt-1 text-sm text-danger-fg">{form.errors.bio}</p>{/if}
  </div>

  <div>
    <label for="phone" class="block font-medium">Phone (optional)</label>
    <input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" value={form?.values?.phone ?? p.phone} class={input} />
  </div>

  <button type="submit" class="btn btn-primary px-8">Save profile</button>
</form>

<div class="mt-10 border-t border-border pt-6">
  <h2 class="mb-3 font-condensed text-xl font-semibold">Your data</h2>
  <a href="/export" class="btn btn-secondary">
    <Download size={18} aria-hidden="true" /> Export all data (CSV)
  </a>
</div>

<div class="mt-10 border-t border-border pt-6">
  <form method="POST" action="/logout">
    <button type="submit" class="btn btn-secondary text-ink-muted">
      <LogOut size={18} aria-hidden="true" /> Log out
    </button>
  </form>
</div>
