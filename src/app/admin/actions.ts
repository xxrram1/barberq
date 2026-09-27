"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { barberPhotos, barberSchedules, barbers, BOOKING_STATUSES, bookings, services } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { defaultSchedule } from "@/lib/schedule";
import { MAX_PHOTO_BYTES, sniffImageType } from "@/lib/slip";

export type FormState = { ok?: boolean; error?: string };

const id = z.coerce.number().int().positive();

function refresh() {
  revalidatePath("/admin", "layout");
  revalidatePath("/bookings");
  revalidatePath("/");
}

// ---------- คิว ----------

export async function setBookingStatus(formData: FormData) {
  await requireAdmin();
  const input = z.object({ id, status: z.enum(BOOKING_STATUSES) }).parse(Object.fromEntries(formData));
  await db.update(bookings).set({ status: input.status }).where(eq(bookings.id, input.id));
  refresh();
}

/** ตรวจสลิป: ผ่าน = ยืนยันคิวให้อัตโนมัติ, ไม่ผ่าน = ลูกค้าส่งสลิปใหม่ได้ */
export async function reviewPayment(formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const input = z
    .object({ id, decision: z.enum(["verified", "rejected"]) })
    .parse(Object.fromEntries(formData));

  const booking = await db.query.bookings.findFirst({ where: eq(bookings.id, input.id) });
  if (!booking) return { error: "ไม่พบคิวนี้" };
  if (booking.paymentStatus !== "submitted") return { error: "สลิปนี้ถูกตรวจไปแล้ว" };

  await db
    .update(bookings)
    .set({
      paymentStatus: input.decision,
      ...(input.decision === "verified" && booking.status === "pending" ? { status: "confirmed" as const } : {}),
    })
    .where(eq(bookings.id, input.id));
  refresh();
  revalidatePath(`/bookings/${input.id}`);
  return {};
}

// ---------- บริการ ----------

const serviceSchema = z.object({
  name: z.string().trim().min(1, "กรุณากรอกชื่อบริการ").max(80),
  description: z.string().trim().max(200).default(""),
  durationMin: z.coerce
    .number()
    .int()
    .min(15, "ระยะเวลาอย่างน้อย 15 นาที")
    .max(240)
    .refine((v) => v % 15 === 0, "ระยะเวลาต้องหารด้วย 15 ลงตัว"),
  price: z.coerce.number().int().min(0, "ราคาต้องไม่ติดลบ").max(100_000),
});

export async function saveService(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = serviceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const serviceId = formData.get("id");
  if (serviceId) {
    await db.update(services).set(parsed.data).where(eq(services.id, id.parse(serviceId)));
  } else {
    await db.insert(services).values(parsed.data);
  }
  refresh();
  return { ok: true };
}

export async function toggleService(formData: FormData) {
  await requireAdmin();
  const input = z.object({ id, active: z.enum(["true", "false"]) }).parse(Object.fromEntries(formData));
  await db.update(services).set({ active: input.active === "true" }).where(eq(services.id, input.id));
  refresh();
}

// ---------- ช่าง ----------

const barberSchema = z.object({
  name: z.string().trim().min(1, "กรุณากรอกชื่อช่าง").max(60),
  bio: z.string().trim().max(200).default(""),
});

export async function saveBarber(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = barberSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const barberId = formData.get("id");
  if (barberId) {
    await db.update(barbers).set(parsed.data).where(eq(barbers.id, id.parse(barberId)));
  } else {
    await db.transaction(async (tx) => {
      const [created] = await tx.insert(barbers).values(parsed.data).returning({ id: barbers.id });
      await tx.insert(barberSchedules).values(defaultSchedule(created.id));
    });
  }
  refresh();
  return { ok: true };
}

export async function toggleBarber(formData: FormData) {
  await requireAdmin();
  const input = z.object({ id, active: z.enum(["true", "false"]) }).parse(Object.fromEntries(formData));
  await db.update(barbers).set({ active: input.active === "true" }).where(eq(barbers.id, input.id));
  refresh();
}

// ---------- รูปโปรไฟล์ช่าง ----------

export async function uploadBarberPhoto(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const barberId = id.safeParse(formData.get("barberId"));
  const file = formData.get("photo");
  if (!barberId.success) return { error: "ไม่พบช่าง" };
  if (!(file instanceof File) || file.size === 0) return { error: "กรุณาเลือกรูป" };
  if (file.size > MAX_PHOTO_BYTES) return { error: "รูปใหญ่เกินไป" };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = sniffImageType(bytes);
  if (!mimeType) return { error: "รองรับเฉพาะไฟล์รูป JPG, PNG หรือ WebP" };

  const barber = await db.query.barbers.findFirst({ where: eq(barbers.id, barberId.data), columns: { id: true } });
  if (!barber) return { error: "ไม่พบช่าง" };

  await db.transaction(async (tx) => {
    await tx
      .insert(barberPhotos)
      .values({ barberId: barber.id, mimeType, data: Buffer.from(bytes) })
      .onConflictDoUpdate({ target: barberPhotos.barberId, set: { mimeType, data: Buffer.from(bytes) } });
    await tx
      .update(barbers)
      .set({ photoVersion: sql`${barbers.photoVersion} + 1` })
      .where(eq(barbers.id, barber.id));
  });
  refresh();
  return { ok: true };
}

export async function removeBarberPhoto(formData: FormData) {
  await requireAdmin();
  const barberId = id.parse(formData.get("barberId"));
  await db.transaction(async (tx) => {
    await tx.delete(barberPhotos).where(eq(barberPhotos.barberId, barberId));
    await tx.update(barbers).set({ photoVersion: 0 }).where(eq(barbers.id, barberId));
  });
  refresh();
}
