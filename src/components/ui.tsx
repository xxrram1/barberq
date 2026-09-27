"use client";

import { useFormStatus } from "react-dom";
import type { BookingStatus, PaymentStatus } from "@/db/schema";

export function SubmitButton({
  children,
  pendingText = "กำลังดำเนินการ...",
  className = "btn-primary",
  disabled,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || disabled}>
      {pending ? pendingText : children}
    </button>
  );
}

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "รอยืนยัน",
  confirmed: "ยืนยันแล้ว",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
};

const STATUS_STYLE: Record<BookingStatus, string> = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  confirmed: "bg-sky-50 text-sky-800 ring-sky-200",
  completed: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  cancelled: "bg-stone-100 text-stone-500 ring-stone-200",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-red-600">{errors[0]}</p>;
}

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  unpaid: "ยังไม่ชำระมัดจำ",
  submitted: "รอตรวจสลิป",
  verified: "ชำระมัดจำแล้ว",
  rejected: "สลิปไม่ผ่าน",
};

const PAYMENT_STYLE: Record<PaymentStatus, string> = {
  unpaid: "bg-stone-100 text-stone-600 ring-stone-200",
  submitted: "bg-violet-50 text-violet-800 ring-violet-200",
  verified: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  rejected: "bg-red-50 text-red-700 ring-red-200",
};

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${PAYMENT_STYLE[status]}`}>
      {PAYMENT_LABEL[status]}
    </span>
  );
}

/** ป้ายบอกว่าร้านเป็นคนจองให้ (โทรมา / walk-in) */
export function StaffBadge() {
  return (
    <span className="inline-flex rounded-full bg-ink/5 px-2.5 py-0.5 text-xs font-medium text-stone-700 ring-1 ring-stone-300 ring-inset">
      จองผ่านร้าน
    </span>
  );
}
