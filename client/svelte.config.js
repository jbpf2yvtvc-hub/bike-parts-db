import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    // Server-only env vars are read via $env/dynamic/private; nothing here
    // is exposed to the client.
    alias: {
      $components: 'src/lib/components'
    }
  }
};

export default config;
