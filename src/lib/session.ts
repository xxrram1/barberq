/**
 * เข้ารหัส/ถอดรหัส JWT ของ session เท่านั้น (ไม่แตะฐานข้อมูล)
 * แยกไฟล์ออกมาเพื่อให้ proxy.ts import ได้แบบเบาๆ
 */
import { jwtVerify, SignJWT } from "jose";
import type { Role } from "@/db/schema";

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 วัน

export type SessionPayload = { userId: number; role: Role };

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET ต้องตั้งค่าและยาวอย่างน้อย 32 ตัวอักษร (ดู .env.example)");
  }
  return new TextEncoder().encode(secret);
}

export async function encryptSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function decryptSession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, secretKey(), { algorithms: ["HS256"] });
    return typeof payload.userId === "number" ? { userId: payload.userId, role: payload.role } : null;
  } catch {
    return null;
  }
}
