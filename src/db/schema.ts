import { sql } from "drizzle-orm";
import { blob, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const ROLES = ["customer", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const BOOKING_STATUSES = ["pending", "confirmed", "completed", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** unpaid = ยังไม่จ่าย, submitted = ส่งสลิปแล้วรอตรวจ, verified = ร้านยืนยันแล้ว, rejected = สลิปไม่ผ่าน */
export const PAYMENT_STATUSES = ["unpaid", "submitted", "verified", "rejected"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const BOOKING_SOURCES = ["online", "staff"] as const;
export type BookingSource = (typeof BOOKING_SOURCES)[number];

const createdAt = () =>
  integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`);

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ROLES }).notNull().default("customer"),
  createdAt: createdAt(),
});

export const services = sqliteTable("services", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  durationMin: integer("duration_min").notNull(),
  price: integer("price").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const barbers = sqliteTable("barbers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  bio: text("bio").notNull().default(""),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  /** 0 = ยังไม่มีรูป, เพิ่มขึ้นทุกครั้งที่เปลี่ยนรูป (ใช้ต่อท้าย URL ให้ browser cache ได้ยาวๆ) */
  photoVersion: integer("photo_version").notNull().default(0),
});

/** รูปโปรไฟล์ช่าง แยกตารางไว้ ดึงรายชื่อช่างจะได้ไม่ต้องโหลดรูปมาด้วย */
export const barberPhotos = sqliteTable("barber_photos", {
  barberId: integer("barber_id")
    .primaryKey()
    .references(() => barbers.id, { onDelete: "cascade" }),
  mimeType: text("mime_type").notNull(),
  data: blob("data", { mode: "buffer" }).notNull(),
});

/** กะงานประจำสัปดาห์ของช่าง: วันไหนไม่มีแถว = วันหยุดของช่างคนนั้น */
export const barberSchedules = sqliteTable(
  "barber_schedules",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    barberId: integer("barber_id")
      .notNull()
      .references(() => barbers.id, { onDelete: "cascade" }),
    /** 0 = อาทิตย์ ... 6 = เสาร์ */
    weekday: integer("weekday").notNull(),
    startMin: integer("start_min").notNull(),
    endMin: integer("end_min").notNull(),
  },
  (t) => [uniqueIndex("barber_schedules_barber_weekday_idx").on(t.barberId, t.weekday)],
);

/** วันลาของช่าง (startDate ถึง endDate รวมทั้งสองวัน) */
export const barberTimeOff = sqliteTable(
  "barber_time_off",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    barberId: integer("barber_id")
      .notNull()
      .references(() => barbers.id, { onDelete: "cascade" }),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    reason: text("reason").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("barber_time_off_barber_idx").on(t.barberId, t.startDate)],
);

/**
 * เวลาเก็บเป็น "วันที่ท้องถิ่นของร้าน" (YYYY-MM-DD) + นาทีนับจากเที่ยงคืน
 * ทำให้การเช็กเวลาชนกันเป็นแค่การเทียบตัวเลข และไม่มีปัญหา timezone
 */
export const bookings = sqliteTable(
  "bookings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** null = ลูกค้าที่ไม่มีบัญชี (ร้านจองให้ทางโทรศัพท์/walk-in) ใช้ guestName/guestPhone แทน */
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
    guestName: text("guest_name"),
    guestPhone: text("guest_phone"),
    /** online = ลูกค้าจองเอง, staff = ร้านจองให้ */
    source: text("source", { enum: BOOKING_SOURCES }).notNull().default("online"),
    serviceId: integer("service_id")
      .notNull()
      .references(() => services.id),
    barberId: integer("barber_id")
      .notNull()
      .references(() => barbers.id),
    date: text("date").notNull(),
    startMin: integer("start_min").notNull(),
    endMin: integer("end_min").notNull(),
    price: integer("price").notNull(),
    status: text("status", { enum: BOOKING_STATUSES }).notNull().default("pending"),
    note: text("note").notNull().default(""),
    /** ยอดมัดจำที่ต้องโอนผ่านพร้อมเพย์ (บาท) */
    deposit: integer("deposit").notNull().default(0),
    paymentStatus: text("payment_status", { enum: PAYMENT_STATUSES }).notNull().default("unpaid"),
    createdAt: createdAt(),
  },
  (t) => [
    index("bookings_barber_date_idx").on(t.barberId, t.date),
    index("bookings_user_idx").on(t.userId),
  ],
);

export type User = typeof users.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Barber = typeof barbers.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type BarberSchedule = typeof barberSchedules.$inferSelect;
export type BarberTimeOff = typeof barberTimeOff.$inferSelect;

/**
 * สลิปโอนเงิน: เก็บรูปไว้ในฐานข้อมูลเลยเพื่อให้ deploy ง่าย (รูปถูกย่อจากฝั่ง client แล้ว)
 * ถ้าใช้งานจริงจังควรย้ายไปเก็บที่ object storage เช่น S3 / Cloudflare R2 แล้วเก็บแค่ key ไว้ที่นี่
 */
export const paymentSlips = sqliteTable(
  "payment_slips",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    bookingId: integer("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    mimeType: text("mime_type").notNull(),
    data: blob("data", { mode: "buffer" }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("payment_slips_booking_idx").on(t.bookingId)],
);
