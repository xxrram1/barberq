import { expect, type Page } from "@playwright/test";
import { SHOP } from "../src/lib/config";
import { addDays, shopNow, weekday } from "../src/lib/time";

export const USERS = {
  demo: { email: "demo@barberq.dev", password: "demo1234" },
  somchai: { email: "somchai@example.com", password: "password" },
  admin: { email: "admin@barberq.dev", password: "admin1234" },
};

export async function login(page: Page, user: { email: string; password: string }, next = "/") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("อีเมล").fill(user.email);
  await page.getByLabel("รหัสผ่าน").fill(user.password);
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

/**
 * วันทำการที่อยู่ห่างจากวันนี้อย่างน้อย offset วัน
 * ข้อมูล seed มีคิวแค่ช่วงไม่กี่วันรอบวันนี้ แต่ละเทสต์จึงใช้ offset ต่างกันเพื่อให้ได้วันที่ว่างและไม่ชนกัน
 */
export function openDate(offset: number): string {
  let date = addDays(shopNow().date, offset);
  while (SHOP.closedWeekdays.includes(weekday(date))) date = addDays(date, 1);
  return date;
}

/**
 * เลือกบริการ ช่าง และวันในหน้าจองคิว แล้วรอให้ช่องเวลาโหลดเสร็จ
 * path: "/book" สำหรับลูกค้า หรือ "/admin/bookings/new" สำหรับร้านจองให้
 */
export async function pickBooking(
  page: Page,
  opts: { service: string; barber: string; date: string; path?: string },
) {
  if (!page.url().endsWith(opts.path ?? "/book")) await page.goto(opts.path ?? "/book");
  await page.getByRole("button", { name: opts.service }).click();
  await page.getByRole("button", { name: opts.barber, exact: true }).click();
  await page.locator(`[data-date="${opts.date}"]`).click();
  await expect(page.locator("[data-slot]").first().or(page.getByTestId("slot-hint"))).toBeVisible();
}

/** ข้อความแจ้งเตือนของแอป (ไม่นับตัวประกาศการเปลี่ยนหน้าที่ Next.js ใส่ role="alert" ไว้) */
export const appAlert = (page: Page) => page.locator('[role="alert"]:not(#__next-route-announcer__)');

/** กดปุ่มยืนยันในหน้าต่างยืนยันของเว็บ (แทน confirm() ของเบราว์เซอร์) */
export async function confirmDialog(page: Page, confirmLabel: string | RegExp) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: confirmLabel }).click();
  await expect(dialog).toBeHidden();
}

/** toast แจ้งผลหลังบันทึก */
export const toast = (page: Page, text: string | RegExp) => page.locator("[data-toast]").filter({ hasText: text });
