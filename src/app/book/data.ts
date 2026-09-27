import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { barbers, services } from "@/db/schema";
import { SHOP } from "@/lib/config";
import { addDays, shopNow, weekday } from "@/lib/time";

/** ข้อมูลที่ฟอร์มจองต้องใช้ (ใช้ร่วมกันระหว่างหน้าลูกค้าและหน้าร้านจองให้) */
export async function loadBookingFormData(serviceParam: string | string[] | undefined) {
  const [serviceList, barberList] = await Promise.all([
    db.query.services.findMany({ where: eq(services.active, true), orderBy: services.id }),
    db.query.barbers.findMany({ where: eq(barbers.active, true), orderBy: barbers.id }),
  ]);

  const now = shopNow();
  const today = now.date;
  // ถ้าวันนี้เลยเวลาจองแล้ว ให้เริ่มที่วันทำการถัดไป
  const todayOver = now.minute + SHOP.minLeadMin > SHOP.closeMin - SHOP.slotStepMin;
  const days = Array.from({ length: SHOP.maxDaysAhead + 1 }, (_, i) => {
    const date = addDays(today, i);
    return { date, closed: SHOP.closedWeekdays.includes(weekday(date)) };
  });

  const initialDate = days.find((d) => !d.closed && !(todayOver && d.date === today))?.date ?? today;
  const preselected = Number(serviceParam);

  return {
    services: serviceList,
    barbers: barberList,
    days,
    initialDate,
    initialServiceId: serviceList.some((s) => s.id === preselected) ? preselected : null,
  };
}
