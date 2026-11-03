import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Keeps the sign-in session fresh and sends signed-out visitors to /login for private pages.
// It must never take the site down: if anything here fails, the request goes through and the
// page itself checks sign-in (and the database enforces every rule regardless).
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(), key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const p = request.nextUrl.pathname;
  if (!url || !key) {
    // Database not connected yet: public pages work, everything else explains what is missing.
    const open = ["/", "/schools", "/terms", "/privacy", "/setup"];
    if (open.includes(p) || p.startsWith("/demo")) return NextResponse.next({ request });
    const to = request.nextUrl.clone(); to.pathname = "/setup"; to.search = "";
    return NextResponse.redirect(to);
  }
  let response = NextResponse.next({ request });
  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user && (p.startsWith("/account") || p.startsWith("/school") || p.startsWith("/admin"))) {
      const to = request.nextUrl.clone();
      to.pathname = "/login";
      to.search = `?next=${encodeURIComponent(p + request.nextUrl.search)}`;
      return NextResponse.redirect(to);
    }
  } catch (e) {
    console.error("middleware: Supabase session check failed", e);
  }
  return response;
}

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!_next/static|_next/image|img/|demo/|favicon.ico).*)"],
};
