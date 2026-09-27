import { NextResponse, type NextRequest } from "next/server";
import { decryptSession, SESSION_COOKIE } from "@/lib/session";

/**
 * ด่านแรกแบบ optimistic: เช็กแค่ JWT ใน cookie เพื่อ redirect ให้เร็ว
 * การตรวจสิทธิ์จริงอยู่ในทุก page และ server action (requireUser/requireAdmin) อีกชั้น
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = await decryptSession(request.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && session.role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/book/:path*", "/bookings/:path*"],
};
