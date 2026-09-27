import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { SHOP } from "@/lib/config";
import { WEEKDAY_NAMES } from "@/lib/schedule";
import { minToTime } from "@/lib/time";

const CUSTOMER_LINKS = [
  { href: "/", label: "หน้าแรก" },
  { href: "/#services", label: "บริการและราคา" },
  { href: "/book", label: "จองคิวออนไลน์" },
  { href: "/bookings", label: "คิวของฉัน" },
];

const ADMIN_LINKS = [
  { href: "/", label: "หน้าแรก" },
  { href: "/admin", label: "หลังร้าน" },
  { href: "/admin/bookings/new", label: "จองให้ลูกค้า" },
  { href: "/admin/bookings", label: "คิวทั้งหมด" },
];

export async function Footer() {
  const isAdmin = (await getCurrentUser())?.role === "admin";
  const links = isAdmin ? ADMIN_LINKS : CUSTOMER_LINKS;
  const { contact } = SHOP;
  const closed = SHOP.closedWeekdays.map((d) => `วัน${WEEKDAY_NAMES[d]}`).join(", ");

  return (
    <footer className="mt-auto bg-ink text-stone-300">
      <div className="barber-stripe h-1.5" />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        {/* แบรนด์ */}
        <div>
          <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold text-paper">
            <span className="grid size-8 place-items-center rounded-lg bg-brass text-sm text-white">✂</span>
            {SHOP.name}
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-stone-400">{SHOP.tagline}</p>
          <Link href={isAdmin ? "/admin/bookings/new" : "/book"} className="btn-brass mt-6">
            {isAdmin ? "+ จองให้ลูกค้า" : "จองคิวเลย →"}
          </Link>
        </div>

        {/* ที่อยู่ */}
        <div>
          <FooterHeading>ที่ตั้งร้าน</FooterHeading>
          <address className="space-y-1 text-sm leading-relaxed not-italic">
            {contact.address.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </address>
          <p className="mt-3 text-xs text-stone-400">📍 {contact.landmark}</p>
        </div>

        {/* เวลาเปิด */}
        <div>
          <FooterHeading>เวลาทำการ</FooterHeading>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-stone-400">เปิดให้บริการ</dt>
              <dd className="font-medium text-paper tabular-nums">
                {minToTime(SHOP.openMin)} – {minToTime(SHOP.closeMin)} น.
              </dd>
            </div>
            {closed && (
              <div>
                <dt className="text-stone-400">วันหยุด</dt>
                <dd className="font-medium text-paper">ทุก{closed}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* ติดต่อ + ลิงก์ */}
        <div>
          <FooterHeading>ติดต่อเรา</FooterHeading>
          <ul className="space-y-2 text-sm">
            <li>📞 {contact.phone}</li>
            <li>💬 LINE: {contact.line}</li>
            <li>👍 Facebook: {contact.facebook}</li>
          </ul>
          <nav aria-label="ลิงก์ท้ายเว็บ" className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="text-stone-400 transition hover:text-brass">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-stone-500">
          <span>
            © {new Date().getFullYear()} {SHOP.name}
          </span>
          <span>สุราษฎร์ธานี · ประเทศไทย</span>
        </div>
      </div>
    </footer>
  );
}

function FooterHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-xs font-semibold tracking-widest text-brass uppercase">{children}</h2>;
}
