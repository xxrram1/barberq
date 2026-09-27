/**
 * ตรรกะคำนวณช่วงเวลาว่าง: เป็น pure function ทั้งหมด (ไม่แตะฐานข้อมูล) จึงเทสต์ได้ง่าย
 */
import { SHOP } from "./config";
import { addDays, isValidDate, weekday, type ShopNow } from "./time";

export type Range = { startMin: number; endMin: number };

export type Slot = { startMin: number; barberIds: number[] };

/** ข้อมูลของช่างหนึ่งคนในวันที่เลือก: กะงาน (null = ไม่เข้างาน/ลา) และคิวที่มีอยู่แล้ว */
export type BarberDay = { shift: Range | null; busy: Range[] };

export function overlaps(a: Range, b: Range): boolean {
  return a.startMin < b.endMin && b.startMin < a.endMin;
}

/** คืนข้อความ error ถ้าวันนั้นจองไม่ได้ หรือ null ถ้าจองได้ */
export function dateError(date: string, now: ShopNow, shop = SHOP): string | null {
  if (!isValidDate(date)) return "รูปแบบวันที่ไม่ถูกต้อง";
  if (date < now.date) return "ไม่สามารถจองวันที่ผ่านมาแล้ว";
  if (date > addDays(now.date, shop.maxDaysAhead))
    return `จองล่วงหน้าได้ไม่เกิน ${shop.maxDaysAhead} วัน`;
  if (shop.closedWeekdays.includes(weekday(date))) return "ร้านปิดทำการในวันนี้";
  return null;
}

/** เวลาเริ่มที่เป็นไปได้ทั้งหมดของบริการที่ใช้เวลา duration นาที */
export function candidateStarts(duration: number, shop = SHOP): number[] {
  const starts: number[] = [];
  for (let t = shop.openMin; t + duration <= shop.closeMin; t += shop.slotStepMin) {
    starts.push(t);
  }
  return starts;
}

/**
 * คำนวณช่องเวลาว่างของวันนั้น
 * @param barberDays กะงานและคิวที่มีอยู่แล้วของช่างแต่ละคน (key = barberId)
 * @returns เฉพาะช่องที่มีช่างว่างอย่างน้อย 1 คน พร้อมรายชื่อช่างที่ว่าง
 */
export function availableSlots(params: {
  date: string;
  duration: number;
  barberDays: Map<number, BarberDay>;
  now: ShopNow;
  shop?: typeof SHOP;
}): Slot[] {
  const { date, duration, barberDays, now, shop = SHOP } = params;
  if (dateError(date, now, shop)) return [];

  const earliest = date === now.date ? now.minute + shop.minLeadMin : -Infinity;

  return candidateStarts(duration, shop)
    .filter((start) => start >= earliest)
    .map((start) => {
      const range = { startMin: start, endMin: start + duration };
      const barberIds = [...barberDays]
        .filter(
          ([, { shift, busy }]) =>
            shift !== null &&
            range.startMin >= shift.startMin &&
            range.endMin <= shift.endMin &&
            !busy.some((b) => overlaps(range, b)),
        )
        .map(([id]) => id);
      return { startMin: start, barberIds };
    })
    .filter((slot) => slot.barberIds.length > 0);
}

/** วันที่ date อยู่ในช่วงวันลาหรือไม่ (รวมวันแรกและวันสุดท้าย) */
export function isOnLeave(date: string, leaves: { startDate: string; endDate: string }[]): boolean {
  return leaves.some((l) => l.startDate <= date && date <= l.endDate);
}

type ShiftRule = { weekday: number; startMin: number; endMin: number };
type Dated = Range & { date: string };

/**
 * หาคิวที่ "หลุดกะ": อยู่นอกเวลาทำงาน หรือตรงกับวันลา
 * ใช้เตือนแอดมินเมื่อแก้กะหรือบันทึกวันลา
 */
export function bookingsOutsideShift<T extends Dated>(
  list: T[],
  schedule: ShiftRule[],
  leaves: { startDate: string; endDate: string }[] = [],
): T[] {
  return list.filter((b) => {
    if (isOnLeave(b.date, leaves)) return true;
    const shift = schedule.find((s) => s.weekday === weekday(b.date));
    return !shift || b.startMin < shift.startMin || b.endMin > shift.endMin;
  });
}
