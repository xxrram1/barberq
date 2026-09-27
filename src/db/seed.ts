/**
 * ล้างข้อมูลแล้วใส่ข้อมูลตัวอย่าง: npm run db:seed
 * บัญชีทดสอบ:
 *   แอดมิน  admin@barberq.dev / admin1234
 *   ลูกค้า   demo@barberq.dev  / demo1234
 */
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import { db } from "./index";
import { barberPhotos, barberSchedules, barberTimeOff, barbers, bookings, paymentSlips, services, users } from "./schema";
import { addDays, shopNow, weekday } from "../lib/time";
import { SHOP } from "../lib/config";
import { defaultSchedule } from "../lib/schedule";

async function main() {
  // seed ล้างข้อมูลทั้งหมด: กันเผลอรันใส่ฐานข้อมูลบนคลาวด์ที่มีข้อมูลจริง
  const url = process.env.DATABASE_URL ?? "file:local.db";
  if (!url.startsWith("file:") && !process.argv.includes("--allow-remote")) {
    console.error(`✖ DATABASE_URL ชี้ไปที่ฐานข้อมูลบนคลาวด์ (${new URL(url).host})`);
    console.error("  seed จะลบข้อมูลทั้งหมด ถ้าตั้งใจจริงให้ใส่ --allow-remote");
    process.exit(1);
  }

  await db.delete(paymentSlips);
  await db.delete(bookings);
  await db.delete(barberTimeOff);
  await db.delete(barberSchedules);
  await db.delete(barberPhotos);
  await db.delete(services);
  await db.delete(barbers);
  await db.delete(users);

  const [admin, demo, somchai] = await db
    .insert(users)
    .values([
      { name: "ผู้ดูแลร้าน", email: "admin@barberq.dev", phone: "0800000000", passwordHash: await bcrypt.hash("admin1234", 10), role: "admin" },
      { name: "ลูกค้าทดลอง", email: "demo@barberq.dev", phone: "0811111111", passwordHash: await bcrypt.hash("demo1234", 10) },
      { name: "สมชาย ใจดี", email: "somchai@example.com", phone: "0822222222", passwordHash: await bcrypt.hash("password", 10) },
    ])
    .returning();

  const svc = await db
    .insert(services)
    .values([
      { name: "ตัดผมชาย", description: "ตัด สระ ไดร์ จัดทรงตามสไตล์ที่ต้องการ", durationMin: 30, price: 250 },
      { name: "ตัดผม + โกนหนวด", description: "ตัดผมพร้อมโกนหนวดด้วยผ้าร้อนแบบคลาสสิก", durationMin: 60, price: 400 },
      { name: "โกนหนวด / แต่งเครา", description: "เล็มเคราให้เข้ารูป โกนด้วยมีดโกน", durationMin: 30, price: 180 },
      { name: "ทำสีผม", description: "ทำสีทั้งศีรษะ รวมทรีตเมนต์บำรุง", durationMin: 90, price: 1200 },
      { name: "ตัดผมเด็ก (ต่ำกว่า 12 ปี)", description: "ตัดผมเด็ก ใจเย็น ไม่เร่งรีบ", durationMin: 30, price: 150 },
    ])
    .returning();

  const brb = await db
    .insert(barbers)
    .values([
      { name: "ช่างเอ็ม", bio: "ถนัดทรงวินเทจและ fade ประสบการณ์ 8 ปี" },
      { name: "ช่างบอส", bio: "สายโมเดิร์น ทำสีผมและดัด" },
      { name: "ช่างนัท", bio: "เชี่ยวชาญการโกนหนวดด้วยมีดโกนแบบดั้งเดิม" },
    ])
    .returning();

  // กะงาน: ช่างเอ็มกะเช้าและหยุดวันจันทร์, ช่างบอสกะบ่าย, ช่างนัทเต็มเวลา
  const schedules = [
    ...defaultSchedule(brb[0].id)
      .filter((s) => s.weekday !== 1)
      .map((s) => ({ ...s, endMin: 18 * 60 })),
    ...defaultSchedule(brb[1].id).map((s) => ({ ...s, startMin: 12 * 60 })),
    ...defaultSchedule(brb[2].id),
  ];
  await db.insert(barberSchedules).values(schedules);

  // สร้างคิวตัวอย่างในวันทำการที่ใกล้ที่สุด 4 วัน (รวมวันที่ผ่านมาแล้วเพื่อให้ dashboard มีข้อมูล)
  const today = shopNow().date;
  const days: string[] = [];
  for (let i = -3; days.length < 6; i++) {
    const d = addDays(today, i);
    if (!SHOP.closedWeekdays.includes(weekday(d))) days.push(d);
  }

  const customers = [demo, somchai];
  const rows: (typeof bookings.$inferInsert)[] = [];
  days.forEach((date, di) => {
    const isPast = date < today;
    [
      { b: 0, s: 0, t: 10 * 60 },
      { b: 0, s: 1, t: 13 * 60 },
      { b: 1, s: 3, t: 14 * 60 },
      { b: 2, s: 2, t: 15 * 60 + 30 },
      { b: 1, s: 0, t: 17 * 60 },
    ]
      .filter((_, i) => (i + di) % 3 !== 0)
      .forEach(({ b, s, t }, i) => {
        const status = isPast ? (i % 4 === 3 ? "cancelled" : "completed") : i % 2 ? "confirmed" : "pending";
        rows.push({
          userId: customers[(i + di) % 2].id,
          barberId: brb[b].id,
          serviceId: svc[s].id,
          date,
          startMin: t,
          endMin: t + svc[s].durationMin,
          price: svc[s].price,
          status,
          deposit: Math.min(SHOP.depositAmount, svc[s].price),
          // คิวที่ยืนยัน/เสร็จแล้วถือว่าจ่ายมัดจำแล้ว, คิวรอยืนยันมีทั้งยังไม่จ่ายและส่งสลิปรอตรวจ
          paymentStatus:
            status === "confirmed" || status === "completed"
              ? "verified"
              : status === "pending" && (i + di) % 2 === 0
                ? "submitted"
                : "unpaid",
        });
      });
  });

  // คิวที่ร้านจองให้: ลูกค้าไม่มีบัญชีที่โทรมาจอง และลูกค้าที่มีบัญชีแต่มาจองหน้าร้าน
  const nextDay = days.find((d) => d > today)!;
  const haircut = svc[0];
  rows.push(
    {
      guestName: "คุณต้น (โทรจอง)",
      guestPhone: "0891234567",
      source: "staff",
      barberId: brb[2].id,
      serviceId: haircut.id,
      date: nextDay,
      startMin: 18 * 60 + 30,
      endMin: 18 * 60 + 30 + haircut.durationMin,
      price: haircut.price,
      status: "confirmed",
    },
    {
      userId: somchai.id,
      source: "staff",
      barberId: brb[2].id,
      serviceId: haircut.id,
      date: nextDay,
      startMin: 19 * 60,
      endMin: 19 * 60 + haircut.durationMin,
      price: haircut.price,
      status: "confirmed",
      note: "walk-in",
    },
  );

  // ช่างนัทลาพักร้อน 2 วันในสัปดาห์หน้า
  const leave = { barberId: brb[2].id, startDate: addDays(today, 6), endDate: addDays(today, 7), reason: "ลาพักร้อน" };
  await db.insert(barberTimeOff).values(leave);

  // เก็บเฉพาะคิวที่อยู่ในกะงานของช่าง และไม่ตรงกับวันลา
  const valid = rows.filter(
    (r) =>
      schedules.some(
        (s) => s.barberId === r.barberId && s.weekday === weekday(r.date) && r.startMin >= s.startMin && r.endMin <= s.endMin,
      ) && !(r.barberId === leave.barberId && r.date >= leave.startDate && r.date <= leave.endDate),
  );
  const inserted = await db.insert(bookings).values(valid).returning();

  // สลิปตัวอย่างสำหรับคิวที่ "รอตรวจสลิป" (ใช้รูป QR เป็นภาพแทนสลิปจริง)
  const submitted = inserted.filter((b) => b.paymentStatus === "submitted");
  for (const b of submitted) {
    const image = await QRCode.toBuffer(`ตัวอย่างสลิป คิว #${b.id} ยอด ${b.deposit} บาท`, { width: 400, margin: 2 });
    await db.insert(paymentSlips).values({ bookingId: b.id, mimeType: "image/png", data: image });
  }

  console.log(`✔ seed เรียบร้อย: ผู้ใช้ 3, บริการ ${svc.length}, ช่าง ${brb.length}, คิว ${valid.length}`);
  console.log(`  แอดมิน: ${admin.email} / admin1234`);
  console.log(`  ลูกค้า:  ${demo.email} / demo1234`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
