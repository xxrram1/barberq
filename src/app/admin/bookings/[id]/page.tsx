import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PaymentBadge, StaffBadge, StatusBadge, SubmitButton } from "@/components/ui";
import { bookings } from "@/db/schema";
import { listBookings } from "@/lib/queries";
import { formatBaht, formatThaiDate, minToTime } from "@/lib/time";
import { reviewPayment } from "../../actions";
import { BookingActions } from "../../booking-actions";

export const metadata: Metadata = { title: "รายละเอียดคิว" };

export default async function AdminBookingDetail({ params, searchParams }: PageProps<"/admin/bookings/[id]">) {
  const id = Number((await params).id);
  const { created } = await searchParams;
  const [b] = Number.isInteger(id) ? await listBookings(eq(bookings.id, id)) : [];
  if (!b) notFound();

  const hasSlip = b.paymentStatus !== "unpaid";

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/bookings?date=${b.date}`} className="text-sm text-muted hover:text-ink">
          ← คิววันที่ {formatThaiDate(b.date, "short")}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl font-semibold">คิว #{b.id}</h1>
          <StatusBadge status={b.status} />
          {b.deposit > 0 && <PaymentBadge status={b.paymentStatus} />}
          {b.source === "staff" && <StaffBadge />}
        </div>
      </div>

      {created && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <span>
            ✓ บันทึกคิวให้ <b>{b.customerName}</b> เรียบร้อย ·{" "}
            {b.userId ? "ลูกค้าเห็นคิวนี้ในบัญชีของตัวเองแล้ว" : "ลูกค้าไม่มีบัญชี แจ้งเวลานัดทางโทรศัพท์"}
          </span>
          <Link href="/admin/bookings/new" className="btn-ghost btn-sm">
            + จองให้ลูกค้าคนถัดไป
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <Item
              label="ลูกค้า"
              value={
                <>
                  {b.customerName}
                  {!b.userId && <span className="ml-1.5 text-xs font-normal text-muted">(ไม่มีบัญชี)</span>}
                </>
              }
            />
            <Item label="เบอร์โทร" value={<a href={`tel:${b.customerPhone}`} className="text-brass hover:underline">{b.customerPhone}</a>} />
            <Item label="บริการ" value={b.serviceName} />
            <Item label="ช่าง" value={b.barberName} />
            <Item label="วันที่" value={formatThaiDate(b.date)} />
            <Item label="เวลา" value={`${minToTime(b.startMin)}–${minToTime(b.endMin)} น.`} />
            <Item label="ราคา" value={formatBaht(b.price)} />
            <Item label="มัดจำ" value={b.deposit > 0 ? formatBaht(b.deposit) : "ไม่มี"} />
          </dl>
          {b.note && <p className="mt-5 rounded-lg bg-paper p-3 text-sm text-stone-600">“{b.note}”</p>}
          <div className="mt-6 border-t border-line pt-5">
            <BookingActions id={b.id} status={b.status} />
          </div>
        </section>

        <section className="card p-6">
          <h2 className="font-display text-lg font-semibold">สลิปโอนมัดจำ</h2>
          {b.deposit === 0 ? (
            <p className="py-10 text-center text-sm text-muted">คิวนี้ไม่มีมัดจำ ชำระทั้งหมดที่ร้าน</p>
          ) : !hasSlip ? (
            <p className="py-10 text-center text-sm text-muted">ลูกค้ายังไม่ได้ส่งสลิป</p>
          ) : (
            <>
              <a href={`/api/slips/${b.id}`} target="_blank" className="mt-4 block">
                {/* eslint-disable-next-line @next/next/no-img-element -- รูปจาก route ที่ต้องตรวจสิทธิ์ ไม่ผ่าน image optimizer */}
                <img
                  src={`/api/slips/${b.id}`}
                  alt={`สลิปของคิว #${b.id}`}
                  className="mx-auto max-h-[480px] rounded-lg border border-line"
                />
              </a>
              <p className="mt-3 text-center text-xs text-muted">
                ตรวจว่ายอด {formatBaht(b.deposit)} เข้าบัญชีจริงก่อนกดยืนยัน
              </p>
              {b.paymentStatus === "submitted" && (
                <div className="mt-4 flex justify-center gap-2">
                  <form action={reviewPayment}>
                    <input type="hidden" name="id" value={b.id} />
                    <input type="hidden" name="decision" value="verified" />
                    <SubmitButton className="btn-primary">✓ ยอดเข้าแล้ว ยืนยันคิว</SubmitButton>
                  </form>
                  <form action={reviewPayment}>
                    <input type="hidden" name="id" value={b.id} />
                    <input type="hidden" name="decision" value="rejected" />
                    <SubmitButton className="btn-danger">สลิปไม่ถูกต้อง</SubmitButton>
                  </form>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
