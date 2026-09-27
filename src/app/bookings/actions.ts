"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { bookings, paymentSlips } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { canCustomerCancel } from "@/lib/booking-rules";
import { MAX_SLIP_BYTES, sniffImageType } from "@/lib/slip";

export async function cancelMyBooking(formData: FormData): Promise<{ error?: string }> {
  const user = await requireUser("/bookings");
  const id = Number(formData.get("id"));

  const booking = await db.query.bookings.findFirst({
    where: and(eq(bookings.id, id), eq(bookings.userId, user.id)),
  });
  if (!booking) return { error: "ไม่พบคิวนี้" };
  if (!canCustomerCancel(booking)) return { error: "ใกล้ถึงเวลานัดแล้ว กรุณาติดต่อร้านเพื่อยกเลิก" };

  await db
    .update(bookings)
    .set({ status: "cancelled" })
    .where(and(eq(bookings.id, id), eq(bookings.userId, user.id), inArray(bookings.status, ["pending", "confirmed"])));

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${id}`);
  revalidatePath("/admin", "layout");
  return {};
}

export type SlipState = { ok?: boolean; error?: string };

export async function uploadSlip(_prev: SlipState, formData: FormData): Promise<SlipState> {
  const user = await requireUser("/bookings");
  const id = Number(formData.get("bookingId"));
  const file = formData.get("slip");

  const booking = await db.query.bookings.findFirst({
    where: and(eq(bookings.id, id), eq(bookings.userId, user.id)),
  });
  if (!booking) return { error: "ไม่พบคิวนี้" };
  if (booking.status === "cancelled" || booking.status === "completed") return { error: "คิวนี้ไม่ต้องชำระมัดจำแล้ว" };
  if (booking.paymentStatus === "verified") return { error: "ร้านยืนยันการชำระเงินของคิวนี้แล้ว" };

  if (!(file instanceof File) || file.size === 0) return { error: "กรุณาเลือกรูปสลิป" };
  if (file.size > MAX_SLIP_BYTES) return { error: "ไฟล์ใหญ่เกินไป (ไม่เกิน 800KB)" };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = sniffImageType(bytes);
  if (!mimeType) return { error: "รองรับเฉพาะไฟล์รูป JPG, PNG หรือ WebP" };

  await db.transaction(async (tx) => {
    // เก็บเฉพาะสลิปล่าสุด (ส่งใหม่ได้ถ้าร้านแจ้งว่าสลิปไม่ถูกต้อง)
    await tx.delete(paymentSlips).where(eq(paymentSlips.bookingId, id));
    await tx.insert(paymentSlips).values({ bookingId: id, mimeType, data: Buffer.from(bytes) });
    await tx.update(bookings).set({ paymentStatus: "submitted" }).where(eq(bookings.id, id));
  });

  revalidatePath(`/bookings/${id}`);
  revalidatePath("/bookings");
  revalidatePath("/admin", "layout");
  return { ok: true };
}
