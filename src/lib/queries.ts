import "server-only";
import { asc, desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { barbers, bookings, services, users } from "@/db/schema";

/** ชื่อ/เบอร์ลูกค้า: ใช้จากบัญชีถ้ามี ไม่งั้นใช้ข้อมูลที่ร้านกรอกไว้ตอนจองให้ */
export const customerNameSql = sql<string>`coalesce(${users.name}, ${bookings.guestName}, '')`;
export const customerPhoneSql = sql<string>`coalesce(${users.phone}, ${bookings.guestPhone}, '')`;

/** ดึงรายการจองพร้อมชื่อบริการ ช่าง และลูกค้า */
export async function listBookings(where?: SQL, order: "asc" | "desc" = "asc") {
  const dir = order === "asc" ? asc : desc;
  return db
    .select({
      id: bookings.id,
      date: bookings.date,
      startMin: bookings.startMin,
      endMin: bookings.endMin,
      price: bookings.price,
      status: bookings.status,
      note: bookings.note,
      deposit: bookings.deposit,
      paymentStatus: bookings.paymentStatus,
      source: bookings.source,
      userId: bookings.userId,
      barberId: bookings.barberId,
      serviceName: services.name,
      barberName: barbers.name,
      customerName: customerNameSql,
      customerPhone: customerPhoneSql,
    })
    .from(bookings)
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .innerJoin(barbers, eq(bookings.barberId, barbers.id))
    .leftJoin(users, eq(bookings.userId, users.id))
    .where(where)
    .orderBy(dir(bookings.date), dir(bookings.startMin));
}

export type BookingRow = Awaited<ReturnType<typeof listBookings>>[number];
