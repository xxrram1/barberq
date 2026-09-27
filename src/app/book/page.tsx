import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { BookingForm } from "./booking-form";
import { loadBookingFormData } from "./data";

export const metadata: Metadata = { title: "จองคิว" };

export default async function BookPage({ searchParams }: PageProps<"/book">) {
  const user = await requireUser("/book");
  const { service } = await searchParams;
  // บัญชีร้านไม่ได้จองให้ตัวเอง แต่จองแทนลูกค้า
  if (user.role === "admin") redirect(`/admin/bookings/new${service ? `?service=${service}` : ""}`);

  const data = await loadBookingFormData(service);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold">จองคิว</h1>
      <p className="mt-1 text-muted">เลือกบริการ ช่าง และเวลาที่สะดวก</p>
      <BookingForm {...data} />
    </div>
  );
}
