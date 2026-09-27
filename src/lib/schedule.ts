import { SHOP } from "./config";

export const WEEKDAY_NAMES = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

/** กะเริ่มต้นของช่างใหม่: เข้างานเต็มเวลาทุกวันที่ร้านเปิด */
export function defaultSchedule(barberId: number) {
  return [0, 1, 2, 3, 4, 5, 6]
    .filter((d) => !SHOP.closedWeekdays.includes(d))
    .map((weekday) => ({ barberId, weekday, startMin: SHOP.openMin, endMin: SHOP.closeMin }));
}

/** ตัวเลือกเวลาในฟอร์ม: ทุกๆ slotStep ตั้งแต่ร้านเปิดถึงร้านปิด */
export function timeOptions(): number[] {
  const out: number[] = [];
  for (let m = SHOP.openMin; m <= SHOP.closeMin; m += SHOP.slotStepMin) out.push(m);
  return out;
}
