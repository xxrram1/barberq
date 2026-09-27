import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PaymentBadge, StaffBadge, StatusBadge, SubmitButton } from "@/components/ui";
import { bookings } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { canCustomerCancel, isUpcoming } from "@/lib/booking-rules";
import { SHOP } from "@/lib/config";
import { listBookings, type BookingRow } from "@/lib/queries";
import { formatBaht, formatThaiDate, minToTime, shopNow } from "@/lib/time";
import { CancelBookingForm } from "./cancel-form";

export const metadata: Metadata = { title: "คิวของฉัน" };

export default async function MyBookingsPage() {
  const user = await requireUser("/bookings");
  if (user.role === "admin") redirect("/admin/bookings");

  const all = await listBookings(eq(bookings.userId, user.id));
  const now = shopNow();
  const upcoming = all.filter((b) => b.status !== "cancelled" && b.status !== "completed" && isUpcoming(b, now));
  const history = all.filter((b) => !upcoming.includes(b)).reverse();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">คิวของฉัน</h1>
          <p className="mt-1 text-muted">สวัสดี {user.name} 👋</p>
        </div>
        <Link href="/book" className="btn-primary">
          + จองคิวใหม่
        </Link>
      </div>

      <h2 className="mt-10 mb-3 font-display text-lg font-semibold">คิวที่กำลังจะถึง ({upcoming.length})</h2>
      {upcoming.length === 0 ? (
        <div className="card p-10 text-center text-muted">
          ยังไม่มีคิวที่จองไว้
          <div className="mt-4">
            <Link href="/book" className="btn-brass">
              จองคิวแรกของคุณ
            </Link>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {upcoming.map((b) => (
            <BookingCard key={b.id} b={b} cancellable={canCustomerCancel(b, now)} />
          ))}
        </ul>
      )}

      {history.length > 0 && (
        <>
          <h2 className="mt-12 mb-3 font-display text-lg font-semibold text-muted">ประวัติ</h2>
          <ul className="space-y-2 opacity-80">
            {history.map((b) => (
              <BookingCard key={b.id} b={b} compact />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function BookingCard({ b, cancellable, compact }: { b: BookingRow; cancellable?: boolean; compact?: boolean }) {
  const needsPayment = !compact && b.deposit > 0 && (b.paymentStatus === "unpaid" || b.paymentStatus === "rejected");

  return (
    <li data-booking-id={b.id} className={`card flex flex-wrap gap-4 sm:flex-nowrap ${compact ? "p-4" : "p-5"}`}>
      <div className={`flex shrink-0 flex-col items-center justify-center rounded-xl bg-paper ${compact ? "w-14 py-1" : "w-16 py-2"}`}>
        <span className="text-xs text-muted">{formatThaiDate(b.date, "short").split(" ")[0]}</span>
        <span className="font-display text-xl font-semibold">{Number(b.date.slice(8))}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/bookings/${b.id}`} className="font-medium hover:text-brass hover:underline">
            {b.serviceName}
          </Link>
          <StatusBadge status={b.status} />
          {!compact && b.deposit > 0 && <PaymentBadge status={b.paymentStatus} />}
          {!compact && b.source === "staff" && <StaffBadge />}
        </div>
        <div className="mt-1 text-sm text-muted">
          {formatThaiDate(b.date)} · {minToTime(b.startMin)}–{minToTime(b.endMin)} น. · {b.barberName} ·{" "}
          {formatBaht(b.price)}
        </div>
        {b.note && !compact && <div className="mt-2 text-sm text-stone-600">“{b.note}”</div>}
      </div>
      {!compact && (
        <div className="flex items-center gap-2 self-center">
          {needsPayment && (
            <Link href={`/bookings/${b.id}`} className="btn-brass btn-sm">
              ชำระมัดจำ
            </Link>
          )}
          {cancellable ? (
            <CancelBookingForm booking={b}>
              <SubmitButton className="btn-danger btn-sm" pendingText="...">
                ยกเลิก
              </SubmitButton>
            </CancelBookingForm>
          ) : (
            <span className="text-xs text-muted" title={`ยกเลิกออนไลน์ได้ก่อนเวลานัด ${SHOP.cancelCutoffMin / 60} ชม.`}>
              ติดต่อร้านเพื่อยกเลิก
            </span>
          )}
        </div>
      )}
    </li>
  );
}
