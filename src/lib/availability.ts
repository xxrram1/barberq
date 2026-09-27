import "server-only";
import { and, eq, gte, inArray, lte, ne } from "drizzle-orm";
import { db } from "@/db";
import { barberSchedules, barberTimeOff, barbers, bookings, services } from "@/db/schema";
import { SHOP } from "./config";
import { availableSlots, isOnLeave, type BarberDay, type Slot } from "./slots";
import { shopNow, weekday } from "./time";

type Db = Pick<typeof db, "select" | "query">;

export type SlotQuery = { serviceId: number; barberId: number | "any"; date: string };

/** รวบรวมกะงาน วันลา และคิวที่ยังไม่ถูกยกเลิกของช่างแต่ละคนในวันนั้น */
export async function loadBarberDays(conn: Db, date: string, barberIds: number[]) {
  const map = new Map<number, BarberDay>();
  if (barberIds.length === 0) return { map, leaves: [] };

  const [shifts, leaves, busy] = await Promise.all([
    conn
      .select()
      .from(barberSchedules)
      .where(and(inArray(barberSchedules.barberId, barberIds), eq(barberSchedules.weekday, weekday(date)))),
    conn
      .select()
      .from(barberTimeOff)
      .where(
        and(
          inArray(barberTimeOff.barberId, barberIds),
          lte(barberTimeOff.startDate, date),
          gte(barberTimeOff.endDate, date),
        ),
      ),
    conn
      .select({ barberId: bookings.barberId, startMin: bookings.startMin, endMin: bookings.endMin })
      .from(bookings)
      .where(
        and(eq(bookings.date, date), inArray(bookings.barberId, barberIds), ne(bookings.status, "cancelled")),
      ),
  ]);

  for (const id of barberIds) {
    const shift = shifts.find((s) => s.barberId === id);
    const onLeave = isOnLeave(date, leaves.filter((l) => l.barberId === id));
    map.set(id, {
      shift: shift && !onLeave ? { startMin: shift.startMin, endMin: shift.endMin } : null,
      busy: busy.filter((b) => b.barberId === id),
    });
  }
  return { map, leaves };
}

/**
 * คำนวณช่องว่างสำหรับบริการ + ช่าง (หรือ "any" = ช่างคนไหนก็ได้) ในวันที่เลือก
 * รับ conn เพื่อให้เรียกใช้ภายใน transaction ตอนสร้างการจองได้
 * @returns reason = เหตุผลที่ช่างที่เลือกไม่ว่างทั้งวัน (ถ้ามี) ไว้แสดงให้ลูกค้าเห็น
 */
export async function findSlots(q: SlotQuery, conn: Db = db, opts: { staff?: boolean } = {}) {
  const service = await conn.query.services.findFirst({
    where: and(eq(services.id, q.serviceId), eq(services.active, true)),
  });
  if (!service) return { service: null, slots: [] as Slot[] };

  const activeBarbers = await conn.query.barbers.findMany({
    where: q.barberId === "any" ? eq(barbers.active, true) : and(eq(barbers.id, q.barberId), eq(barbers.active, true)),
    columns: { id: true, name: true },
    orderBy: barbers.id,
  });

  const { map: barberDays, leaves } = await loadBarberDays(conn, q.date, activeBarbers.map((b) => b.id));

  const slots = availableSlots({
    date: q.date,
    duration: service.durationMin,
    barberDays,
    now: shopNow(),
    // ร้านจองให้ลูกค้า walk-in ได้ทันที ไม่ต้องล่วงหน้าเหมือนจองออนไลน์
    shop: opts.staff ? { ...SHOP, minLeadMin: 0 } : SHOP,
  });

  let reason: string | undefined;
  if (q.barberId !== "any" && activeBarbers[0] && barberDays.get(activeBarbers[0].id)?.shift === null) {
    const name = activeBarbers[0].name;
    const leave = leaves[0];
    reason = leave
      ? `${name}ลางานวันนี้${leave.reason ? ` (${leave.reason})` : ""} ลองเลือกช่างคนอื่นหรือวันอื่นนะ`
      : `${name}ไม่ได้เข้างานวันนี้ ลองเลือกช่างคนอื่นหรือวันอื่นนะ`;
  }

  return { service, slots, reason };
}
