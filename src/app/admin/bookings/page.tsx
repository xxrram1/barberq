import { and, eq, like, or, type SQL } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { PaymentBadge, StaffBadge, StatusBadge, STATUS_LABEL } from "@/components/ui";
import { BOOKING_STATUSES, bookings, type BookingStatus } from "@/db/schema";
import { customerNameSql, customerPhoneSql, listBookings } from "@/lib/queries";
import { formatBaht, formatThaiDate, isValidDate, minToTime, shopNow } from "@/lib/time";
import { BookingActions } from "../booking-actions";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "คิวทั้งหมด" };

export default async function AdminBookingsPage({ searchParams }: PageProps<"/admin/bookings">) {
  await requireAdmin();
  const sp = await searchParams;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : undefined);

  // ไม่ส่ง date มา = วันนี้, ส่งค่าว่าง = ทุกวัน
  const date = str(sp.date) ?? shopNow().date;
  const status = BOOKING_STATUSES.includes(str(sp.status) as BookingStatus) ? (str(sp.status) as BookingStatus) : "";
  const q = str(sp.q) ?? "";

  const filters: SQL[] = [];
  if (date && isValidDate(date)) filters.push(eq(bookings.date, date));
  if (status) filters.push(eq(bookings.status, status));
  if (q) filters.push(or(like(customerNameSql, `%${q}%`), like(customerPhoneSql, `%${q}%`))!);

  const rows = await listBookings(filters.length ? and(...filters) : undefined, date ? "asc" : "desc");
  const total = rows.filter((r) => r.status !== "cancelled").reduce((s, r) => s + r.price, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">คิวทั้งหมด</h1>
          <p className="text-sm text-muted">
            {date ? formatThaiDate(date) : "ทุกวัน"} · {rows.length} รายการ · มูลค่า {formatBaht(total)}
          </p>
        </div>
        <Link href="/admin/bookings/new" className="btn-brass">
          + จองให้ลูกค้า
        </Link>
      </div>

      <form className="card flex flex-wrap items-end gap-3 p-4">
        <div>
          <label htmlFor="date" className="label">
            วันที่
          </label>
          <input id="date" type="date" name="date" defaultValue={date} className="input" />
        </div>
        <div>
          <label htmlFor="status" className="label">
            สถานะ
          </label>
          <select id="status" name="status" defaultValue={status} className="input">
            <option value="">ทั้งหมด</option>
            {BOOKING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-48 flex-1">
          <label htmlFor="q" className="label">
            ค้นหาลูกค้า
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="ชื่อหรือเบอร์โทร" className="input" />
        </div>
        <button className="btn-primary">กรอง</button>
        <Link href="/admin/bookings?date=" className="btn-ghost">
          ดูทุกวัน
        </Link>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-line bg-paper text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">วัน-เวลา</th>
              <th className="px-4 py-3 font-medium">ลูกค้า</th>
              <th className="px-4 py-3 font-medium">บริการ</th>
              <th className="px-4 py-3 font-medium">ช่าง</th>
              <th className="px-4 py-3 font-medium">สถานะ</th>
              <th className="px-4 py-3 text-right font-medium">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted">
                  ไม่พบคิวตามเงื่อนไขที่เลือก
                </td>
              </tr>
            )}
            {rows.map((b) => (
              <tr key={b.id} className={b.status === "cancelled" ? "text-stone-400" : ""}>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="font-medium tabular-nums">
                    {minToTime(b.startMin)}–{minToTime(b.endMin)}
                  </div>
                  <div className="text-xs text-muted">{formatThaiDate(b.date, "short")}</div>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/bookings/${b.id}`} className="block font-medium hover:text-brass hover:underline">
                    {b.customerName}
                  </Link>
                  <a href={`tel:${b.customerPhone}`} className="text-xs text-muted hover:text-brass">
                    {b.customerPhone}
                  </a>
                </td>
                <td className="px-4 py-3">
                  <div>{b.serviceName}</div>
                  <div className="text-xs text-muted">{formatBaht(b.price)}</div>
                  {b.note && <div className="mt-1 max-w-56 text-xs text-stone-500 italic">“{b.note}”</div>}
                </td>
                <td className="px-4 py-3">{b.barberName}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col items-start gap-1">
                    <StatusBadge status={b.status} />
                    {b.deposit > 0 && b.status !== "cancelled" && <PaymentBadge status={b.paymentStatus} />}
                    {b.source === "staff" && <StaffBadge />}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <BookingActions id={b.id} status={b.status} who={`${b.customerName} · ${formatThaiDate(b.date, "short")} ${minToTime(b.startMin)} น.`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
