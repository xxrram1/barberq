import { ConfirmButton, SubmitButton } from "@/components/ui";
import type { BookingStatus } from "@/db/schema";
import { setBookingStatus } from "./actions";

const NEXT_STEP: Partial<Record<BookingStatus, { status: BookingStatus; label: string; className: string }>> = {
  pending: { status: "confirmed", label: "ยืนยัน", className: "btn-primary btn-sm" },
  confirmed: { status: "completed", label: "เสร็จสิ้น", className: "btn-brass btn-sm" },
};

export function BookingActions({ id, status }: { id: number; status: BookingStatus }) {
  const next = NEXT_STEP[status];
  if (!next) return null;
  return (
    <div className="flex justify-end gap-1.5">
      <form action={setBookingStatus}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="status" value={next.status} />
        <SubmitButton className={next.className} pendingText="...">
          {next.label}
        </SubmitButton>
      </form>
      <form action={setBookingStatus}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="status" value="cancelled" />
        <ConfirmButton message="ยืนยันการยกเลิกคิวนี้?">ยกเลิก</ConfirmButton>
      </form>
    </div>
  );
}
