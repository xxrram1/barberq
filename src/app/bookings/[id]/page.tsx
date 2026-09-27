import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { PaymentBadge, StaffBadge, StatusBadge, SubmitButton } from "@/components/ui";
import { bookings } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { canCustomerCancel } from "@/lib/booking-rules";
import { SHOP } from "@/lib/config";
import { promptPayPayload } from "@/lib/promptpay";
import { listBookings } from "@/lib/queries";
import { formatBaht, formatThaiDate, minToTime } from "@/lib/time";
import { CancelBookingForm } from "../cancel-form";
import { SlipUploader } from "./slip-uploader";

export const metadata: Metadata = { title: "รายละเอียดคิว" };

function maskPromptPay(id: string) {
  const d = id.replace(/\D/g, "");
  return d.length === 10 ? `${d.slice(0, 3)}-xxx-${d.slice(6)}` : `${d.slice(0, 1)}-xxxx-xxxxx-${d.slice(-3)}`;
}

export default async function BookingDetailPage({ params, searchParams }: PageProps<"/bookings/[id]">) {
  const id = Number((await params).id);
  const { booked } = await searchParams;
  const user = await requireUser(`/bookings/${id}`);
  if (user.role === "admin") redirect(`/admin/bookings/${id}`);

  // ผูกกับ userId เสมอ: เปิดดูคิวของคนอื่นด้วยการเดา id ไม่ได้
  const [b] = Number.isInteger(id) ? await listBookings(and(eq(bookings.id, id), eq(bookings.userId, user.id))) : [];
  if (!b) notFound();

  const active = b.status === "pending" || b.status === "confirmed";
  const needsPayment = active && b.deposit > 0 && b.paymentStatus !== "verified";
  const promptPayId = process.env.PROMPTPAY_ID ?? "0812345678";
  const qrSvg = needsPayment
    ? await QRCode.toString(promptPayPayload(promptPayId, b.deposit), {
        type: "svg",
        margin: 1,
        color: { dark: "#1c1917", light: "#ffffff" },
      })
    : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/bookings" className="text-sm text-muted hover:text-ink">
        ← คิวของฉัน
      </Link>

      {booked && (
        <div className="mt-4 flex gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-600 text-lg text-white">✓</span>
          <div>
            <div className="font-display text-lg font-semibold text-emerald-900">จองคิวสำเร็จ!</div>
            <p className="text-sm text-emerald-800">
              {b.deposit > 0
                ? `ชำระมัดจำ ${formatBaht(b.deposit)} ผ่านพร้อมเพย์ด้านล่าง เพื่อให้ร้านยืนยันคิวได้เร็วขึ้น`
                : "ร้านจะยืนยันคิวให้เร็วๆ นี้"}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
        <section className="card overflow-hidden md:self-start">
          <div className="barber-stripe h-1.5" />
          <div className="p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-semibold">{b.serviceName}</h1>
              <StatusBadge status={b.status} />
              {b.deposit > 0 && <PaymentBadge status={b.paymentStatus} />}
              {b.source === "staff" && <StaffBadge />}
            </div>
            <p className="mt-1 text-sm text-muted">หมายเลขคิว #{b.id}</p>

            <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
              <Item label="วันที่" value={formatThaiDate(b.date)} />
              <Item label="เวลา" value={`${minToTime(b.startMin)}–${minToTime(b.endMin)} น.`} />
              <Item label="ช่าง" value={b.barberName} />
              <Item label="ราคา" value={formatBaht(b.price)} />
              {b.deposit > 0 && <Item label="มัดจำ" value={`${formatBaht(b.deposit)} (หักจากค่าบริการ)`} />}
              {b.deposit > 0 && <Item label="ชำระที่ร้าน" value={formatBaht(b.price - b.deposit)} />}
            </dl>
            {b.note && <p className="mt-5 rounded-lg bg-paper p-3 text-sm text-stone-600">“{b.note}”</p>}

            <div className="mt-6 border-t border-line pt-5">
              {canCustomerCancel(b) ? (
                <CancelBookingForm booking={b} className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted">
                    ยกเลิกได้ก่อนเวลานัด {SHOP.cancelCutoffMin / 60} ชม.
                    {b.paymentStatus === "verified" && " · ร้านจะติดต่อคืนมัดจำ"}
                  </span>
                  <SubmitButton className="btn-danger btn-sm" pendingText="...">
                    ยกเลิกคิว
                  </SubmitButton>
                </CancelBookingForm>
              ) : (
                active && <p className="text-xs text-muted">ต้องการเปลี่ยนแปลงหรือยกเลิก กรุณาติดต่อร้าน</p>
              )}
            </div>
          </div>
        </section>

        {b.deposit > 0 && active && (
          <aside className="card p-6 md:self-start">
            <h2 className="font-display text-lg font-semibold">ชำระมัดจำ</h2>

            {b.paymentStatus === "verified" ? (
              <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-center text-emerald-800">
                <div className="text-3xl">✓</div>
                <div className="mt-1 font-medium">ร้านได้รับมัดจำแล้ว</div>
              </div>
            ) : (
              <>
                {b.paymentStatus === "rejected" && (
                  <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    ร้านตรวจสอบแล้วสลิปไม่ถูกต้อง กรุณาโอนและส่งสลิปใหม่
                  </p>
                )}
                {b.paymentStatus === "submitted" && (
                  <div className="mt-3 rounded-lg bg-violet-50 p-3 text-sm text-violet-800">
                    ได้รับสลิปแล้ว รอร้านตรวจสอบ
                    <a href={`/api/slips/${b.id}`} target="_blank" className="mt-1 block text-xs underline">
                      ดูสลิปที่ส่ง
                    </a>
                  </div>
                )}

                <div className="mt-4 rounded-xl border border-line p-4 text-center">
                  <div className="text-xs font-semibold tracking-widest text-[#0e3d6b]">PromptPay</div>
                  <div
                    className="mx-auto mt-2 w-48 [&>svg]:h-auto [&>svg]:w-full"
                    role="img"
                    aria-label={`QR พร้อมเพย์ ยอด ${b.deposit} บาท`}
                    dangerouslySetInnerHTML={{ __html: qrSvg! }}
                  />
                  <div className="mt-2 font-display text-2xl font-semibold">{formatBaht(b.deposit)}</div>
                  <div className="text-xs text-muted">
                    {SHOP.name} · {maskPromptPay(promptPayId)}
                  </div>
                </div>
                <ol className="mt-4 list-decimal space-y-1 pl-5 text-xs text-muted">
                  <li>สแกน QR ด้วยแอปธนาคาร (ยอดเงินขึ้นให้อัตโนมัติ)</li>
                  <li>บันทึกภาพสลิป แล้วอัปโหลดด้านล่าง</li>
                </ol>
                <div className="mt-4">
                  <SlipUploader bookingId={b.id} resubmit={b.paymentStatus !== "unpaid"} />
                </div>
              </>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
