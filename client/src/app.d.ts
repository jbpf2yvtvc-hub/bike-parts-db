// See https://kit.svelte.dev/docs/types#app
import type PocketBase from 'pocketbase';
import type { AuthRecord } from 'pocketbase';

declare global {
  namespace App {
    interface Locals {
      pb: PocketBase;
      user: AuthRecord | null;
    }
    interface PageData {
      user?: AuthRecord | null;
    }
    // interface Error {}
    // interface Platform {}
  }
}

export {};
