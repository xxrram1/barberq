import Link from "next/link";
import { logout } from "@/app/(auth)/actions";
import { getCurrentUser } from "@/lib/auth";
import { SHOP } from "@/lib/config";

export async function Navbar() {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "admin";

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="barber-stripe h-1" />
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold">
          <span className="grid size-8 place-items-center rounded-lg bg-ink text-sm text-paper">✂</span>
          {SHOP.name}
        </Link>

        <div className="ml-auto flex items-center gap-1 text-sm sm:gap-2">
          {user ? (
            <>
              {isAdmin ? (
                <>
                  <Link href="/admin" className="rounded-lg px-3 py-2 font-medium text-brass hover:bg-brass-soft">
                    หลังร้าน
                  </Link>
                  <Link href="/admin/bookings/new" className="btn-primary btn-sm sm:px-4 sm:py-2">
                    + จองให้ลูกค้า
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/bookings" className="hidden rounded-lg px-3 py-2 hover:bg-stone-100 sm:block">
                    คิวของฉัน
                  </Link>
                  <Link href="/book" className="btn-primary btn-sm sm:px-4 sm:py-2">
                    จองคิว
                  </Link>
                </>
              )}
              <details className="relative">
                <summary className="grid size-9 cursor-pointer list-none place-items-center rounded-full bg-brass-soft font-medium text-brass-dark">
                  {user.name.charAt(0)}
                </summary>
                <div className="card absolute right-0 mt-2 w-56 p-2 shadow-lg">
                  <div className="px-3 py-2">
                    <div className="font-medium">{user.name}</div>
                    <div className="truncate text-xs text-muted">{user.email}</div>
                  </div>
                  <Link
                    href={isAdmin ? "/admin" : "/bookings"}
                    className="block rounded-lg px-3 py-2 hover:bg-stone-100"
                  >
                    {isAdmin ? "หลังร้าน" : "คิวของฉัน"}
                  </Link>
                  <form action={logout}>
                    <button className="w-full rounded-lg px-3 py-2 text-left text-red-700 hover:bg-red-50">
                      ออกจากระบบ
                    </button>
                  </form>
                </div>
              </details>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-3 py-2 hover:bg-stone-100">
                เข้าสู่ระบบ
              </Link>
              <Link href="/book" className="btn-primary btn-sm sm:px-4 sm:py-2">
                จองคิว
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
