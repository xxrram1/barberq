import { describe, expect, it } from "vitest";
import { availableSlots, bookingsOutsideShift, candidateStarts, dateError, isOnLeave, overlaps, type BarberDay, type Range } from "./slots";
import { SHOP } from "./config";
import { shopNow } from "./time";

const shop = { ...SHOP, openMin: 600, closeMin: 720, slotStepMin: 30, closedWeekdays: [3] };
// 2026-10-05 เป็นวันจันทร์
const now = { date: "2026-10-05", minute: 8 * 60 };
const FULL: Range = { startMin: 600, endMin: 720 };
/** ช่างที่เข้างานเต็มกะ พร้อมคิวที่มีอยู่แล้ว */
const day = (busy: Range[] = [], shift: Range | null = FULL): BarberDay => ({ shift, busy });

describe("overlaps", () => {
  it("ช่วงที่แค่ชนขอบกันถือว่าไม่ทับ", () => {
    expect(overlaps({ startMin: 600, endMin: 630 }, { startMin: 630, endMin: 660 })).toBe(false);
  });
  it("ช่วงที่ซ้อนกันบางส่วนถือว่าทับ", () => {
    expect(overlaps({ startMin: 600, endMin: 660 }, { startMin: 630, endMin: 690 })).toBe(true);
  });
  it("ช่วงที่อยู่ข้างในอีกช่วงถือว่าทับ", () => {
    expect(overlaps({ startMin: 600, endMin: 720 }, { startMin: 630, endMin: 660 })).toBe(true);
  });
});

describe("candidateStarts", () => {
  it("บริการต้องจบก่อนร้านปิด", () => {
    expect(candidateStarts(60, shop)).toEqual([600, 630, 660]);
  });
});

describe("dateError", () => {
  it("ปฏิเสธวันที่ผ่านมาแล้ว", () => {
    expect(dateError("2026-10-04", now, shop)).toMatch(/ผ่านมาแล้ว/);
  });
  it("ปฏิเสธวันหยุดของร้าน", () => {
    expect(dateError("2026-10-07", now, shop)).toMatch(/ปิดทำการ/);
  });
  it("ปฏิเสธวันที่ไกลเกินกำหนด", () => {
    expect(dateError("2026-12-31", now, shop)).toMatch(/ล่วงหน้า/);
  });
  it("ปฏิเสธวันที่ที่ไม่มีจริง", () => {
    expect(dateError("2026-02-30", now, shop)).toMatch(/รูปแบบ/);
  });
  it("ยอมรับวันทำการปกติ", () => {
    expect(dateError("2026-10-06", now, shop)).toBeNull();
  });
});

describe("availableSlots", () => {
  it("ตัดช่องที่ชนกับคิวเดิมของช่างออก", () => {
    const slots = availableSlots({
      date: "2026-10-06",
      duration: 30,
      barberDays: new Map([[1, day([{ startMin: 630, endMin: 690 }])]]),
      now,
      shop,
    });
    expect(slots.map((s) => s.startMin)).toEqual([600, 690]);
  });

  it("ช่องยังว่างถ้ามีช่างอย่างน้อยหนึ่งคนว่าง", () => {
    const slots = availableSlots({
      date: "2026-10-06",
      duration: 30,
      barberDays: new Map([
        [1, day([{ startMin: 600, endMin: 720 }])],
        [2, day([{ startMin: 600, endMin: 630 }])],
      ]),
      now,
      shop,
    });
    expect(slots).toEqual([
      { startMin: 630, barberIds: [2] },
      { startMin: 660, barberIds: [2] },
      { startMin: 690, barberIds: [2] },
    ]);
  });

  it("วันนี้ต้องจองล่วงหน้าตามเวลาขั้นต่ำ", () => {
    const slots = availableSlots({
      date: now.date,
      duration: 30,
      barberDays: new Map([[1, day()]]),
      now: { date: now.date, minute: 615 }, // 10:15 + ล่วงหน้า 30 นาที = 10:45
      shop,
    });
    expect(slots.map((s) => s.startMin)).toEqual([660, 690]);
  });

  it("วันที่ร้านปิดไม่มีช่องว่างเลย", () => {
    const slots = availableSlots({
      date: "2026-10-07",
      duration: 30,
      barberDays: new Map([[1, day()]]),
      now,
      shop,
    });
    expect(slots).toEqual([]);
  });
});

describe("availableSlots: กะงานของช่าง", () => {
  it("ไม่มีช่องเวลาถ้าช่างไม่เข้างานวันนั้น", () => {
    const slots = availableSlots({ date: "2026-10-06", duration: 30, barberDays: new Map([[1, day([], null)]]), now, shop });
    expect(slots).toEqual([]);
  });

  it("บริการต้องเริ่มและจบภายในกะของช่าง", () => {
    const slots = availableSlots({
      date: "2026-10-06",
      duration: 60,
      barberDays: new Map([[1, day([], { startMin: 630, endMin: 720 })]]), // เข้างาน 10:30
      now,
      shop,
    });
    expect(slots.map((s) => s.startMin)).toEqual([630, 660]);
  });

  it("ช่องเวลาไปที่ช่างที่เข้างานอยู่ในเวลานั้น", () => {
    const slots = availableSlots({
      date: "2026-10-06",
      duration: 30,
      barberDays: new Map([
        [1, day([], { startMin: 600, endMin: 660 })], // กะเช้า
        [2, day([], { startMin: 660, endMin: 720 })], // กะบ่าย
      ]),
      now,
      shop,
    });
    expect(slots).toEqual([
      { startMin: 600, barberIds: [1] },
      { startMin: 630, barberIds: [1] },
      { startMin: 660, barberIds: [2] },
      { startMin: 690, barberIds: [2] },
    ]);
  });
});

describe("isOnLeave", () => {
  const leaves = [{ startDate: "2026-10-10", endDate: "2026-10-12" }];
  it.each([
    ["2026-10-09", false],
    ["2026-10-10", true],
    ["2026-10-11", true],
    ["2026-10-12", true],
    ["2026-10-13", false],
  ])("%s → %s", (date, expected) => {
    expect(isOnLeave(date, leaves)).toBe(expected);
  });
});

describe("bookingsOutsideShift", () => {
  // 2026-10-05 = จันทร์ (1), 2026-10-06 = อังคาร (2)
  const schedule = [{ weekday: 1, startMin: 600, endMin: 720 }];
  const b = (date: string, startMin: number, endMin: number) => ({ date, startMin, endMin });

  it("คิวในกะไม่ถูกนับ", () => {
    expect(bookingsOutsideShift([b("2026-10-05", 600, 660)], schedule)).toEqual([]);
  });
  it("คิวที่เกินเวลาเลิกงานถูกนับ", () => {
    expect(bookingsOutsideShift([b("2026-10-05", 690, 750)], schedule)).toHaveLength(1);
  });
  it("คิวในวันที่ไม่มีกะถูกนับ", () => {
    expect(bookingsOutsideShift([b("2026-10-06", 600, 630)], schedule)).toHaveLength(1);
  });
  it("คิวในวันลาถูกนับแม้จะอยู่ในกะ", () => {
    const leaves = [{ startDate: "2026-10-05", endDate: "2026-10-05" }];
    expect(bookingsOutsideShift([b("2026-10-05", 600, 630)], schedule, leaves)).toHaveLength(1);
  });
});

describe("shopNow", () => {
  it("แปลงเป็นเวลาไทย (UTC+7)", () => {
    expect(shopNow(new Date("2026-10-05T20:30:00Z"))).toEqual({ date: "2026-10-06", minute: 3 * 60 + 30 });
  });
});
