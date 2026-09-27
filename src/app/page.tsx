import { eq } from "drizzle-orm";
import Link from "next/link";
import { BarberAvatar } from "@/components/barber-avatar";
import { db } from "@/db";
import { barbers, services } from "@/db/schema";
import { SHOP } from "@/lib/config";
import { formatBaht, minToTime } from "@/lib/time";

const WEEKDAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

export default async function Home() {
  const [serviceList, barberList] = await Promise.all([
    db.query.services.findMany({ where: eq(services.active, true), orderBy: services.id }),
    db.query.barbers.findMany({ where: eq(barbers.active, true), orderBy: barbers.id }),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink text-paper">
        <div className="absolute inset-y-0 right-0 hidden w-24 opacity-80 lg:block barber-stripe" />
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:py-28 lg:grid-cols-[1.3fr_1fr] lg:items-center lg:pr-32">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-white/15 px-3 py-1 text-xs tracking-wide text-stone-300">
              เปิด {minToTime(SHOP.openMin)}–{minToTime(SHOP.closeMin)} น. · หยุดทุก
              {SHOP.closedWeekdays.map((d) => `วัน${WEEKDAYS[d]}`).join(", ")}
            </p>
            <h1 className="font-display text-4xl leading-tight font-bold sm:text-6xl">
              หล่อได้ <span className="text-brass">ไม่ต้องรอคิว</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-stone-300">
              เลือกบริการ เลือกช่างคนโปรด และเวลาที่สะดวก จองเสร็จในไม่ถึงนาที มาถึงร้านแล้วนั่งเก้าอี้ได้เลย
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/book" className="btn-brass px-6 py-3 text-base">
                จองคิวเลย →
              </Link>
              <a href="#services" className="btn border border-white/20 px-6 py-3 text-base hover:bg-white/10">
                ดูบริการและราคา
              </a>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-3 lg:grid-cols-1">
            {[
              ["3 ขั้นตอน", "เลือกบริการ ช่าง และเวลา"],
              ["ยืนยันทันที", "เห็นช่องเวลาว่างแบบเรียลไทม์"],
              ["ยกเลิกได้", `ล่วงหน้า ${SHOP.cancelCutoffMin / 60} ชม. ก่อนเวลานัด`],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
                <dt className="font-display text-lg font-semibold text-brass sm:text-xl">{title}</dt>
                <dd className="mt-1 text-xs text-stone-400 sm:text-sm">{desc}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium tracking-widest text-brass uppercase">Services</p>
            <h2 className="font-display text-3xl font-semibold">บริการและราคา</h2>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {serviceList.map((s) => (
            <Link
              key={s.id}
              href={`/book?service=${s.id}`}
              className="card group flex flex-col p-6 transition hover:-translate-y-0.5 hover:border-brass hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-lg font-semibold">{s.name}</h3>
                <span className="font-display text-lg font-semibold text-brass">{formatBaht(s.price)}</span>
              </div>
              <p className="mt-2 flex-1 text-sm text-muted">{s.description}</p>
              <div className="mt-5 flex items-center justify-between text-sm">
                <span className="text-muted">⏱ {s.durationMin} นาที</span>
                <span className="font-medium opacity-0 transition group-hover:opacity-100">จองบริการนี้ →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Barbers */}
      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <p className="text-sm font-medium tracking-widest text-brass uppercase">Our barbers</p>
          <h2 className="mb-10 font-display text-3xl font-semibold">ทีมช่างของเรา</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {barberList.map((b) => (
              <div key={b.id} className="flex flex-col items-center text-center">
                <BarberAvatar barber={b} className="size-28 text-3xl ring-4 ring-paper shadow-md" decorative />
                <h3 className="mt-4 font-display text-lg font-semibold">{b.name}</h3>
                <p className="mt-1 text-sm text-muted">{b.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="relative overflow-hidden rounded-3xl bg-brass px-8 py-12 text-white sm:px-12">
          <h2 className="font-display text-3xl font-semibold">พร้อมเปลี่ยนลุคแล้วหรือยัง?</h2>
          <p className="mt-2 text-white/80">เช็กช่องเวลาว่างได้ทันที ไม่ต้องโทรจอง</p>
          <Link href="/book" className="btn mt-6 bg-white px-6 py-3 text-base text-ink hover:bg-paper">
            จองคิวตอนนี้
          </Link>
        </div>
      </section>
    </>
  );
}
