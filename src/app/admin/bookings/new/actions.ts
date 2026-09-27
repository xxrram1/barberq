"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { placeBooking, slotInputSchema, type BookingOwner } from "@/lib/booking-service";
import { phoneSchema } from "@/lib/phone";
import type { BookingState } from "@/app/book/actions";

/** หาลูกค้าที่มีบัญชีอยู่แล้วจากเบอร์โทร (ใช้เติมชื่อให้อัตโนมัติ) */
async function findCustomerByPhone(phone: string) {
  return db.query.users.findFirst({
    where: and(eq(users.phone, phone), eq(users.role, "customer")),
    columns: { id: true, name: true },
  });
}

export async function lookupCustomer(rawPhone: string): Promise<{ name: string } | null> {
  await requireAdmin();
  const phone = phoneSchema.safeParse(rawPhone);
  if (!phone.success) return null;
  const customer = await findCustomerByPhone(phone.data);
  return customer ? { name: customer.name } : null;
}

const customerSchema = z.object({
  customerPhone: phoneSchema,
  customerName: z.string().trim().min(2, "กรุณากรอกชื่อลูกค้า").max(80),
});

export async function createStaffBooking(_prev: BookingState, formData: FormData): Promise<BookingState> {
  await requireAdmin();
  const raw = Object.fromEntries(formData);

  const customer = customerSchema.safeParse(raw);
  if (!customer.success) return { error: customer.error.issues[0].message };
  const slot = slotInputSchema.safeParse(raw);
  if (!slot.success) return { error: slot.error.issues[0]?.message ?? "ข้อมูลการจองไม่ครบถ้วน" };

  // ถ้าเบอร์นี้มีบัญชีอยู่แล้ว ผูกคิวกับบัญชีนั้น ลูกค้าจะเห็นคิวในหน้า "คิวของฉัน"
  const existing = await findCustomerByPhone(customer.data.customerPhone);
  const owner: BookingOwner = existing
    ? { userId: existing.id }
    : { guestName: customer.data.customerName, guestPhone: customer.data.customerPhone };

  const result = await placeBooking(slot.data, owner, { staff: true });
  if ("error" in result) return result;

  revalidatePath("/admin", "layout");
  revalidatePath("/bookings");
  redirect(`/admin/bookings/${result.id}?created=1`);
}
