import { ActionForm } from "@/components/feedback";
import { SubmitButton } from "@/components/ui";
import type { BookingStatus } from "@/db/schema";
import { setBookingStatus } from "./actions";

const NEXT_STEP: Partial<
  Record<BookingStatus, { status: BookingStatus; label: string; className: string; success: string }>
> = {
  pending: { status: "confirmed", label: "ยืนยัน", className: "btn-primary btn-sm", success: "ยืนยันคิวแล้ว" },
  confirmed: { status: "completed", label: "เสร็จสิ้น", className: "btn-brass btn-sm", success: "บันทึกว่าให้บริการเสร็จแล้ว" },
};

/** @param who ข้อความระบุคิว เช่น "คุณเอ · 14:00" ใช้ในหน้าต่างยืนยัน */
export function BookingActions({ id, status, who }: { id: number; status: BookingStatus; who?: string }) {
  const next = NEXT_STEP[status];
  if (!next) return null;
  return (
    <div className="flex justify-end gap-1.5">
      <ActionForm action={setBookingStatus} success={next.success}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="status" value={next.status} />
        <SubmitButton className={next.className} pendingText="...">
          {next.label}
        </SubmitButton>
      </ActionForm>
      <ActionForm
        action={setBookingStatus}
        success="ยกเลิกคิวแล้ว"
        confirm={{
          title: "ยกเลิกคิวนี้?",
          message: `${who ? `${who} · ` : ""}ช่องเวลานี้จะกลับมาว่างให้คนอื่นจองได้ทันที`,
          confirmLabel: "ยกเลิกคิว",
          danger: true,
        }}
      >
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="status" value="cancelled" />
        <SubmitButton className="btn-danger btn-sm" pendingText="...">
          ยกเลิก
        </SubmitButton>
      </ActionForm>
    </div>
  );
}
