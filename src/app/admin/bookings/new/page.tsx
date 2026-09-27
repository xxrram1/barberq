import type { Metadata } from "next";
import Link from "next/link";
import { BookingForm } from "@/app/book/booking-form";
import { loadBookingFormData } from "@/app/book/data";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "จองให้ลูกค้า" };

export default async function StaffBookingPage({ searchParams }: PageProps<"/admin/bookings/new">) {
  await requireAdmin();
  const { service } = await searchParams;
  const data = await loadBookingFormData(service);

  return (
    <div>
      <Link href="/admin/bookings" className="text-sm text-muted hover:text-ink">
        ← คิวทั้งหมด
      </Link>
      <h1 className="mt-2 font-display text-2xl font-semibold">จองให้ลูกค้า</h1>
      <p className="text-sm text-muted">สำหรับลูกค้าที่โทรมาจองหรือ walk-in เข้าร้าน · จองช่วงเวลาที่เริ่มได้ทันที</p>
      <BookingForm {...data} staff />
    </div>
  );
}
