/**
 * PocketBase SDK — SERVER ONLY.
 *
 * This file lives under $lib/server, which SvelteKit forbids importing into
 * client code (it is a build error). The PocketBase URL and any admin
 * credentials therefore never reach the browser. The browser never contacts
 * PocketBase directly and never learns its URL (§2.2).
 */
import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';

export function createPocketBase(): PocketBase {
  const url = env.POCKETBASE_URL;
  if (!url) {
    throw new Error(
      'POCKETBASE_URL is not set. Copy .env.example to client/.env (local) or set it in the Cloudflare Pages dashboard (no VITE_ prefix).'
    );
  }
  return new PocketBase(url);
}
