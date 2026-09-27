"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "ภาพรวม" },
  { href: "/admin/bookings", label: "คิวทั้งหมด" },
  { href: "/admin/services", label: "บริการ" },
  { href: "/admin/barbers", label: "ช่าง" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-white p-1">
      {LINKS.map((l) => {
        const active = l.href === "/admin" ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-muted transition hover:text-ink aria-[current=page]:bg-ink aria-[current=page]:text-paper"
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
