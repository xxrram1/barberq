"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, deleteSession } from "@/lib/auth";
import { phoneSchema } from "@/lib/phone";
import { safeNext } from "@/lib/url";

export type AuthState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: Record<string, string>;
};

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "กรุณากรอกชื่ออย่างน้อย 2 ตัวอักษร").max(80),
    email: z.email("อีเมลไม่ถูกต้อง").trim().toLowerCase(),
    phone: phoneSchema,
    password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร").max(72),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "รหัสผ่านไม่ตรงกัน", path: ["confirm"] });

export async function register(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const values = { name: raw.name ?? "", email: raw.email ?? "", phone: raw.phone ?? "" };
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const { name, email, phone, password } = parsed.data;
  const existing = await db.query.users.findFirst({ where: eq(users.email, email), columns: { id: true } });
  if (existing) {
    return { fieldErrors: { email: ["อีเมลนี้ถูกใช้สมัครแล้ว"] }, values };
  }

  const [user] = await db
    .insert(users)
    .values({ name, email, phone, passwordHash: await bcrypt.hash(password, 10) })
    .returning({ id: users.id, role: users.role });

  await createSession({ userId: user.id, role: user.role });
  redirect(safeNext(formData.get("next")));
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase(),
  password: z.string(),
});

// hash หลอกไว้เทียบเมื่อไม่พบอีเมล เพื่อให้เวลาตอบกลับใกล้เคียงกัน (กันการเดาว่าอีเมลไหนมีในระบบ)
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = loginSchema.parse({
    email: formData.get("email") ?? "",
    password: formData.get("password") ?? "",
  });

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) {
    return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง", values: { email } };
  }

  await createSession({ userId: user.id, role: user.role });
  const next = safeNext(formData.get("next"));
  redirect(next === "/" && user.role === "admin" ? "/admin" : next);
}

export async function logout() {
  await deleteSession();
  redirect("/");
}
