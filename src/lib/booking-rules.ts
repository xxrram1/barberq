import type { Booking } from "@/db/schema";
import { SHOP } from "./config";
import { shopNow, type ShopNow } from "./time";

/** นัดหมายยังไม่ถึงเวลา (นับตามเวลาของร้าน) */
export function isUpcoming(b: Pick<Booking, "date" | "startMin">, now: ShopNow = shopNow()): boolean {
  return b.date > now.date || (b.date === now.date && b.startMin > now.minute);
}

/** ลูกค้ายกเลิกเองได้ถ้ายังไม่เสร็จ/ไม่ถูกยกเลิก และเหลือเวลาก่อนนัดมากกว่าที่กำหนด */
export function canCustomerCancel(
  b: Pick<Booking, "date" | "startMin" | "status">,
  now: ShopNow = shopNow(),
): boolean {
  if (b.status !== "pending" && b.status !== "confirmed") return false;
  if (b.date !== now.date) return b.date > now.date;
  return b.startMin - now.minute >= SHOP.cancelCutoffMin;
}
