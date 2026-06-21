import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Refreshes the Supabase auth session on every request and guards routes. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // No Supabase configured yet → skip auth entirely (keeps dev/demo working).
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // protect /dashboard, /admin, /banker, /nonbank — redirect to login if no user
  const protectedPrefixes = ["/dashboard", "/admin", "/banker", "/nonbank"];
  const path = request.nextUrl.pathname;
  const isProtected = protectedPrefixes.some((p) => path.startsWith(p));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}