import { z } from "zod";

/** ตัดช่องว่างและขีดออก: "081-234 5678" → "0812345678" */
export function normalizePhone(raw: string): string {
  return raw.trim().replace(/[\s-]/g, "");
}

/** เบอร์มือถือหรือเบอร์บ้านไทย ขึ้นต้นด้วย 0 ยาว 9–10 หลัก */
export const phoneSchema = z
  .string()
  .transform(normalizePhone)
  .pipe(z.string().regex(/^0\d{8,9}$/, "เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)"));
