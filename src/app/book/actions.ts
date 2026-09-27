"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { placeBooking, slotInputSchema } from "@/lib/booking-service";

export type BookingState = { error?: string; conflict?: boolean };

export async function createBooking(_prev: BookingState, formData: FormData): Promise<BookingState> {
  const user = await requireUser("/book");
  if (user.role === "admin") return { error: "บัญชีร้านใช้เมนู \"จองให้ลูกค้า\" ในหน้าหลังร้าน" };

  const parsed = slotInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ข้อมูลการจองไม่ครบถ้วน" };
  }

  const result = await placeBooking(parsed.data, { userId: user.id }, { staff: false });
  if ("error" in result) return result;

  revalidatePath("/bookings");
  revalidatePath("/admin", "layout");
  redirect(`/bookings/${result.id}?booked=1`);
}
