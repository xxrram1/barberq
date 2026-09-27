import { ActionForm } from "@/components/feedback";
import type { BookingRow } from "@/lib/queries";
import { formatThaiDate, minToTime } from "@/lib/time";
import { cancelMyBooking } from "./actions";

/** ฟอร์มยกเลิกคิวของลูกค้า ใช้ทั้งหน้ารายการและหน้ารายละเอียด */
export function CancelBookingForm({
  booking: b,
  className,
  children,
}: {
  booking: Pick<BookingRow, "id" | "serviceName" | "date" | "startMin" | "paymentStatus">;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <ActionForm
      action={cancelMyBooking}
      success="ยกเลิกคิวเรียบร้อยแล้ว"
      className={className}
      confirm={{
        title: "ยกเลิกคิวนี้?",
        message: `${b.serviceName} · ${formatThaiDate(b.date, "short")} เวลา ${minToTime(b.startMin)} น.${
          b.paymentStatus === "verified" ? " · ร้านจะติดต่อกลับเรื่องคืนมัดจำ" : ""
        }`,
        confirmLabel: "ยกเลิกคิว",
        danger: true,
      }}
    >
      <input type="hidden" name="id" value={b.id} />
      {children}
    </ActionForm>
  );
}
