import "server-only";
import { and, eq, gt, lt, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { bookings, type Booking } from "@/db/schema";
import { findSlots } from "./availability";
import { SHOP } from "./config";
import { dateError } from "./slots";
import { shopNow } from "./time";

export const slotInputSchema = z.object({
  serviceId: z.coerce.number().int().positive(),
  barberId: z.union([z.literal("any"), z.coerce.number().int().positive()]),
  date: z.string(),
  startMin: z.coerce.number().int().min(0).max(24 * 60),
  note: z.string().trim().max(200, "หมายเหตุยาวเกิน 200 ตัวอักษร").default(""),
});
export type SlotInput = z.infer<typeof slotInputSchema>;

/** ลูกค้าเจ้าของคิว: มีบัญชี (userId) หรือไม่มีบัญชี (ชื่อ + เบอร์) */
export type BookingOwner = { userId: number } | { guestName: string; guestPhone: string };

export type BookingResult = { id: number } | { error: string; conflict?: boolean };

/**
 * สร้างการจอง ใช้ร่วมกันทั้งลูกค้าจองเองและร้านจองให้
 * ตรวจช่องว่างซ้ำ + insert ใน write transaction เดียวกัน
 * SQLite อนุญาตให้มี write transaction ได้ทีละอัน จึงกันกรณีสองคนกดจองช่องเดียวกันพร้อมกันได้
 */
export async function placeBooking(
  input: SlotInput,
  owner: BookingOwner,
  opts: { staff: boolean },
): Promise<BookingResult> {
  const reason = dateError(input.date, shopNow());
  if (reason) return { error: reason };

  return db.transaction(async (tx): Promise<BookingResult> => {
    const { service, slots } = await findSlots(input, tx, { staff: opts.staff });
    if (!service) return { error: "ไม่พบบริการนี้ หรือบริการปิดให้บริการแล้ว" };

    const slot = slots.find((s) => s.startMin === input.startMin);
    if (!slot) return { error: "ขออภัย ช่วงเวลานี้เพิ่งถูกจองไป กรุณาเลือกเวลาอื่น", conflict: true };

    const endMin = input.startMin + service.durationMin;

    // ลูกค้าคนเดียวกันไม่ควรมีสองคิวที่เวลาทับกัน
    const sameCustomer =
      "userId" in owner ? eq(bookings.userId, owner.userId) : eq(bookings.guestPhone, owner.guestPhone);
    const clash = await tx.query.bookings.findFirst({
      where: and(
        sameCustomer,
        eq(bookings.date, input.date),
        ne(bookings.status, "cancelled"),
        lt(bookings.startMin, endMin),
        gt(bookings.endMin, input.startMin),
      ),
      columns: { id: true },
    });
    if (clash) {
      return { error: opts.staff ? "ลูกค้าคนนี้มีคิวอื่นที่เวลาทับซ้อนกันอยู่แล้ว" : "คุณมีคิวอื่นที่เวลาทับซ้อนกันอยู่แล้ว" };
    }

    const values: typeof bookings.$inferInsert = {
      ...owner,
      serviceId: service.id,
      barberId: slot.barberIds[0], // ถ้าเลือก "ช่างคนไหนก็ได้" จะได้ช่างคนแรกที่ว่าง
      date: input.date,
      startMin: input.startMin,
      endMin,
      price: service.price,
      note: input.note,
      ...(opts.staff
        ? // ร้านจองให้เอง: ยืนยันทันที ไม่ต้องจ่ายมัดจำออนไลน์
          { source: "staff", status: "confirmed", deposit: 0 }
        : { source: "online", status: "pending", deposit: Math.min(SHOP.depositAmount, service.price) }),
    } satisfies Partial<Booking>;

    const [created] = await tx.insert(bookings).values(values).returning({ id: bookings.id });
    return { id: created.id };
  });
}
