"use server";

import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { barberSchedules, barberTimeOff, bookings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { SHOP } from "@/lib/config";
import { listBookings } from "@/lib/queries";
import { bookingsOutsideShift } from "@/lib/slots";
import { formatThaiDate, isValidDate, minToTime, shopNow } from "@/lib/time";

export type ScheduleState = { ok?: boolean; error?: string; warning?: string };
/** checked = ช่วงวันที่ที่ใช้ตรวจ conflicts (กันกรณีแก้วันหลังเห็นคำเตือนแล้วกดยืนยันเลย) */
export type TimeOffState = { ok?: boolean; error?: string; conflicts?: string[]; checked?: string };

const id = z.coerce.number().int().positive();

function refresh(barberId: number) {
  revalidatePath(`/admin/barbers/${barberId}`);
  revalidatePath("/admin", "layout");
}

/** คิวที่ยังไม่เสร็จ/ไม่ถูกยกเลิกของช่าง ตั้งแต่วันนี้เป็นต้นไป */
function upcomingBookingsOf(barberId: number, from: string, to?: string) {
  return listBookings(
    and(
      eq(bookings.barberId, barberId),
      inArray(bookings.status, ["pending", "confirmed"]),
      gte(bookings.date, from),
      to ? lte(bookings.date, to) : undefined,
    ),
  );
}

const describe = (b: { date: string; startMin: number; customerName: string }) =>
  `${formatThaiDate(b.date, "short")} ${minToTime(b.startMin)} น. · ${b.customerName}`;

export async function saveSchedule(_prev: ScheduleState, formData: FormData): Promise<ScheduleState> {
  await requireAdmin();
  const barberId = id.parse(formData.get("barberId"));

  const rows: { barberId: number; weekday: number; startMin: number; endMin: number }[] = [];
  for (let d = 0; d < 7; d++) {
    if (formData.get(`on_${d}`) !== "on") continue;
    const startMin = Number(formData.get(`start_${d}`));
    const endMin = Number(formData.get(`end_${d}`));
    if (!Number.isInteger(startMin) || !Number.isInteger(endMin)) return { error: "เวลาไม่ถูกต้อง" };
    if (startMin < SHOP.openMin || endMin > SHOP.closeMin) return { error: "เวลาทำงานต้องอยู่ในเวลาเปิดร้าน" };
    if (endMin - startMin < SHOP.slotStepMin) return { error: "เวลาเลิกงานต้องหลังเวลาเข้างาน" };
    rows.push({ barberId, weekday: d, startMin, endMin });
  }

  await db.transaction(async (tx) => {
    await tx.delete(barberSchedules).where(eq(barberSchedules.barberId, barberId));
    if (rows.length) await tx.insert(barberSchedules).values(rows);
  });
  refresh(barberId);

  // บันทึกได้เลย แต่เตือนถ้ามีคิวเดิมที่ตอนนี้อยู่นอกกะ
  const affected = bookingsOutsideShift(await upcomingBookingsOf(barberId, shopNow().date), rows);
  return affected.length
    ? { ok: true, warning: `มี ${affected.length} คิวที่อยู่นอกเวลาทำงานใหม่: ${affected.map(describe).join(", ")}` }
    : { ok: true };
}

const timeOffSchema = z
  .object({
    barberId: id,
    startDate: z.string().refine(isValidDate, "กรุณาเลือกวันเริ่มลา"),
    endDate: z.string().refine(isValidDate, "กรุณาเลือกวันสิ้นสุด"),
    reason: z.string().trim().max(100).default(""),
    force: z.string().optional(),
  })
  .refine((d) => d.endDate >= d.startDate, { message: "วันสิ้นสุดต้องไม่ก่อนวันเริ่มลา" });

export async function addTimeOff(_prev: TimeOffState, formData: FormData): Promise<TimeOffState> {
  await requireAdmin();
  const parsed = timeOffSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { force, ...leave } = parsed.data;

  // ถ้ามีคิวค้างในช่วงลา ให้แอดมินเห็นก่อน แล้วกดยืนยันซ้ำถึงจะบันทึก
  const conflicts = await upcomingBookingsOf(leave.barberId, leave.startDate, leave.endDate);
  const checked = `${leave.startDate}|${leave.endDate}`;
  if (conflicts.length && force !== checked) {
    return { conflicts: conflicts.map(describe), checked };
  }

  await db.insert(barberTimeOff).values(leave);
  refresh(leave.barberId);
  return { ok: true };
}

export async function deleteTimeOff(formData: FormData) {
  await requireAdmin();
  const input = z.object({ id, barberId: id }).parse(Object.fromEntries(formData));
  await db
    .delete(barberTimeOff)
    .where(and(eq(barberTimeOff.id, input.id), eq(barberTimeOff.barberId, input.barberId)));
  refresh(input.barberId);
}
