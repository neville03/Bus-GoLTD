import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Keeps the sign-in session fresh and sends signed-out visitors to /login for private pages.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // Database not connected yet: public pages work, everything else explains what is missing.
    const open = ["/", "/schools", "/terms", "/privacy", "/setup"];
    const p = request.nextUrl.pathname;
    if (open.includes(p) || p.startsWith("/demo")) return response;
    const url = request.nextUrl.clone(); url.pathname = "/setup"; url.search = "";
    return NextResponse.redirect(url);
  }
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
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
  const p = request.nextUrl.pathname;
  if (!user && (p.startsWith("/account") || p.startsWith("/school") || p.startsWith("/admin"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(p + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|img/|demo/|favicon.ico).*)"] };
