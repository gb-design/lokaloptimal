import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerClient, supabaseConfigured } from "./lib/supabase/server";

const protectedDashboard = /^\/dashboard(?:\/|$)/;
const protectedApi = /^\/api\/internal(?:\/|$)/;

function securePrivateResponse(response: Response) {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  return response;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;
  const isLogin = path === "/dashboard/login";
  const isDashboard = protectedDashboard.test(path);
  const isInternalApi = protectedApi.test(path);
  const needsAuth = (isDashboard && !isLogin) || isInternalApi;

  if (!needsAuth) {
    const response = await next();
    return isDashboard ? securePrivateResponse(response) : response;
  }

  if (!supabaseConfigured()) {
    if (isInternalApi) {
      return securePrivateResponse(Response.json(
        { error: "Das Dashboard ist noch nicht mit Supabase verbunden." },
        { status: 503 },
      ));
    }
    return securePrivateResponse(context.redirect("/dashboard/login?setup=1"));
  }

  const supabase = createSupabaseServerClient(context);
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    if (isInternalApi) {
      return securePrivateResponse(Response.json(
        { error: "Bitte melden Sie sich erneut an." },
        { status: 401 },
      ));
    }
    const nextPath = encodeURIComponent(`${path}${context.url.search}`);
    return securePrivateResponse(context.redirect(`/dashboard/login?next=${nextPath}`));
  }

  context.locals.user = { id: data.user.id, email: data.user.email };
  return securePrivateResponse(await next());
});
