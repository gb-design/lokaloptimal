/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare const process: {
  env: Record<string, string | undefined>;
};

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL?: string;
  readonly PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    user?: {
      id: string;
      email?: string;
    };
  }
}
