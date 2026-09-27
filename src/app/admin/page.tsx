import { and, count, eq, gte, like, ne, sum } from "drizzle-orm";
import Link from "next/link";
import { StatusBadge } from "@/components/ui";
import { db } from "@/db";
import { barbers, bookings } from "@/db/schema";
import { SHOP } from "@/lib/config";
import { listBookings, type BookingRow } from "@/lib/queries";
import { formatBaht, formatThaiDate, minToTime, shopNow } from "@/lib/time";
import { BookingActions } from "./booking-actions";
import { requireAdmin } from "@/lib/auth";

const PX_PER_MIN = 1.1;

export default async function AdminDashboard() {
  await requireAdmin();
  const now = shopNow();
  const month = now.date.slice(0, 7);

  const [today, pending, slipsToReview, barberList, [monthStats]] =
    await Promise.all([
      listBookings(eq(bookings.date, now.date)),
      listBookings(
        and(eq(bookings.status, "pending"), gte(bookings.date, now.date)),
      ),
      listBookings(
        and(
          eq(bookings.paymentStatus, "submitted"),
          ne(bookings.status, "cancelled"),
        ),
      ),
      db.query.barbers.findMany({
        where: eq(barbers.active, true),
        orderBy: barbers.id,
      }),
      db
        .select({ revenue: sum(bookings.price), done: count() })
        .from(bookings)
        .where(
          and(
            like(bookings.date, `${month}-%`),
            eq(bookings.status, "completed"),
          ),
        ),
    ]);

  const todayActive = today.filter((b) => b.status !== "cancelled");
  const stats = [
    {
      label: "คิววันนี้",
      value: todayActive.length,
      hint: `${today.length - todayActive.length} ยกเลิก`,
    },
    {
      label: "รอยืนยัน",
      value: pending.length,
      hint: "ทุกวันที่กำลังจะถึง",
      accent: pending.length > 0,
    },
    {
      label: "รายได้คาดการณ์วันนี้",
      value: formatBaht(todayActive.reduce((s, b) => s + b.price, 0)),
      hint: "ไม่รวมคิวที่ยกเลิก",
    },
    {
      label: "รายได้เดือนนี้",
      value: formatBaht(Number(monthStats?.revenue ?? 0)),
      hint: `${monthStats?.done ?? 0} คิวที่เสร็จสิ้น`,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">ภาพรวมวันนี้</h1>
        <p className="text-sm text-muted">{formatThaiDate(now.date)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`card p-5 ${s.accent ? "border-amber-300 bg-amber-50" : ""}`}
          >
            <div className="text-sm text-muted">{s.label}</div>
            <div className="mt-1 font-display text-2xl font-semibold tabular-nums sm:text-3xl">
              {s.value}
            </div>
            <div className="mt-1 text-xs text-muted">{s.hint}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="card min-w-0 p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">
            ตารางคิววันนี้
          </h2>
          <Timeline
            bookings={todayActive}
            barbers={barberList}
            nowMin={now.minute}
          />
        </section>

        <div className="space-y-6 lg:self-start">
          {slipsToReview.length > 0 && (
            <section className="card border-violet-200 p-5">
              <h2 className="mb-3 font-display text-lg font-semibold">
                🧾 รอตรวจสลิป ({slipsToReview.length})
              </h2>
              <ul className="divide-y divide-line">
                {slipsToReview.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/admin/bookings/${b.id}`}
                      className="flex items-center justify-between gap-2 py-2.5 hover:text-brass"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {b.customerName}
                        </span>
                        <span className="text-xs text-muted">
                          {formatThaiDate(b.date, "short")} ·{" "}
                          {minToTime(b.startMin)} · มัดจำ{" "}
                          {formatBaht(b.deposit)}
                        </span>
                      </span>
                      <span className="text-sm">ตรวจ →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">รอยืนยัน</h2>
              <Link
                href="/admin/bookings?status=pending&date="
                className="text-sm text-brass hover:underline"
              >
                ดูทั้งหมด
              </Link>
            </div>
            {pending.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">
                ไม่มีคิวที่รอยืนยัน 🎉
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {pending.slice(0, 6).map((b) => (
                  <li key={b.id} className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/admin/bookings/${b.id}`}
                          className="block truncate font-medium hover:text-brass"
                        >
                          {b.customerName}
                        </Link>
                        <div className="text-xs text-muted">
                          {formatThaiDate(b.date, "short")} ·{" "}
                          {minToTime(b.startMin)} · {b.serviceName} ·{" "}
                          {b.barberName}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <BookingActions id={b.id} status={b.status} who={`${b.customerName} · ${formatThaiDate(b.date, "short")} ${minToTime(b.startMin)} น.`} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/** ตารางเวลาแนวตั้ง แยกคอลัมน์ตามช่าง */
function Timeline({
  bookings: list,
  barbers: barberList,
  nowMin,
}: {
  bookings: BookingRow[];
  barbers: { id: number; name: string }[];
  nowMin: number;
}) {
  const hours: number[] = [];
  for (let m = SHOP.openMin; m <= SHOP.closeMin; m += 60) hours.push(m);
  const height = (SHOP.closeMin - SHOP.openMin) * PX_PER_MIN;
  const top = (m: number) => (m - SHOP.openMin) * PX_PER_MIN;
  const showNow = nowMin >= SHOP.openMin && nowMin <= SHOP.closeMin;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[520px]">
        <div
          className="grid gap-2 pl-12"
          style={{
            gridTemplateColumns: `repeat(${barberList.length}, minmax(0, 1fr))`,
          }}
        >
          {barberList.map((b) => (
            <div key={b.id} className="pb-2 text-center text-sm font-medium">
              {b.name}
            </div>
          ))}
        </div>
        <div className="relative" style={{ height }}>
          {hours.map((m) => (
            <div
              key={m}
              className="absolute inset-x-0 flex items-center gap-2"
              style={{ top: top(m) }}
            >
              <span className="w-10 -translate-y-1/2 text-right text-[11px] text-muted tabular-nums">
                {minToTime(m)}
              </span>
              <span className="h-px flex-1 bg-line" />
            </div>
          ))}
          {showNow && (
            <div
              className="absolute right-0 left-10 z-10 flex items-center"
              style={{ top: top(nowMin) }}
            >
              <span className="size-2 -translate-x-1 rounded-full bg-red-500" />
              <span className="h-px flex-1 bg-red-500" />
            </div>
          )}
          <div
            className="absolute inset-y-0 right-0 left-12 grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${barberList.length}, minmax(0, 1fr))`,
            }}
          >
            {barberList.map((barber) => (
              <div key={barber.id} className="relative">
                {list
                  .filter((b) => b.barberId === barber.id)
                  .map((b) => (
                    <div
                      key={b.id}
                      className={`absolute inset-x-0 overflow-hidden rounded-lg border-l-4 px-2 py-1 text-xs ${
                        b.status === "pending"
                          ? "border-amber-400 bg-amber-50"
                          : b.status === "completed"
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-sky-500 bg-sky-50"
                      }`}
                      style={{
                        top: top(b.startMin) + 1,
                        height: (b.endMin - b.startMin) * PX_PER_MIN - 2,
                      }}
                      title={`${b.customerName} · ${b.serviceName}`}
                    >
                      <div className="font-medium tabular-nums">
                        {minToTime(b.startMin)} {b.customerName}
                      </div>
                      <div className="truncate text-muted">{b.serviceName}</div>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted">
          {(["pending", "confirmed", "completed"] as const).map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>
      </div>
    </div>
  );
}
