import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import type { AstroCookies } from "astro";

type ServerContext = {
  request: Request;
  cookies: AstroCookies;
};

export function supabaseConfigured() {
  return Boolean(import.meta.env.PUBLIC_SUPABASE_URL && import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export function createSupabaseServerClient({ request, cookies }: ServerContext) {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const publishableKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get("cookie") || "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookies.set(name, value, { ...options, path: options.path || "/" });
        });
      },
    },
    global: {
      headers: {
        "X-Client-Info": "lokaloptimal-dashboard",
        Cookie: request.headers.get("cookie") || "",
      },
    },
  });
}

export async function getAuthenticatedUser(context: ServerContext) {
  if (!supabaseConfigured()) return null;
  const supabase = createSupabaseServerClient(context);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}
