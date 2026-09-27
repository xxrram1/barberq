import "server-only";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { decryptSession, encryptSession, SESSION_COOKIE, SESSION_MAX_AGE, type SessionPayload } from "./session";

export type CurrentUser = Pick<User, "id" | "name" | "email" | "phone" | "role">;

export async function createSession(payload: SessionPayload) {
  const token = await encryptSession(payload);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function deleteSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * อ่านผู้ใช้จาก session แล้วดึงข้อมูลล่าสุดจากฐานข้อมูลเสมอ
 * (ถ้าผู้ใช้ถูกลบหรือเปลี่ยน role จะมีผลทันที ไม่ต้องรอ token หมดอายุ)
 * ใช้ cache() เพื่อให้ query แค่ครั้งเดียวต่อหนึ่ง request
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await decryptSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
    columns: { id: true, name: true, email: true, phone: true, role: true },
  });
  return user ?? null;
});

export async function requireUser(returnTo = "/"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser("/admin");
  if (user.role !== "admin") redirect("/");
  return user;
}
