import { expect, test } from "@playwright/test";
import QRCode from "qrcode";
import { login, openDate, pickBooking, USERS } from "./helpers";

test.beforeEach(async ({ page }) => {
  await login(page, USERS.admin);
});

test("แอดมินล็อกอินแล้วเข้า dashboard อัตโนมัติ", async ({ page }) => {
  await expect(page).toHaveURL("/admin");
  await expect(page.getByRole("heading", { name: "ภาพรวมวันนี้" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "ตารางคิววันนี้" })).toBeVisible();
});

test("อัปโหลดรูปโปรไฟล์ช่าง แสดงในหน้าแรกและหน้าจอง แล้วลบรูปได้", async ({ page }) => {
  await page.goto("/admin/barbers");
  // รูปแนวนอน ระบบต้องตัดเป็นจัตุรัสให้
  const photo = await QRCode.toBuffer("barber photo", { width: 800 });
  await page.getByLabel("อัปโหลดรูปของช่างเอ็ม").setInputFiles({ name: "m.png", mimeType: "image/png", buffer: photo });
  await expect(page.getByText("อัปเดตรูปแล้ว")).toBeVisible();

  const avatar = page.locator('img[src^="/api/barbers/"]').first();
  await expect(avatar).toBeVisible();
  const size = await avatar.evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight]);
  expect(size).toEqual([512, 512]);
  await page.screenshot({ path: "test-results/screens/admin-barbers.png" });

  // หน้าแรก (ไม่ต้องล็อกอิน) เห็นรูป
  const ctx = await page.context().browser()!.newContext();
  const guest = await ctx.newPage();
  await guest.goto("/");
  const homeImg = guest.locator('img[src^="/api/barbers/"]');
  await expect(homeImg).toHaveCount(1);
  expect(await homeImg.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await homeImg.scrollIntoViewIfNeeded();
  await guest.screenshot({ path: "test-results/screens/home-barbers.png" });
  await ctx.close();

  // ลบรูป → กลับไปเป็นตัวอักษร
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "ลบรูป" }).click();
  await expect(page.locator('img[src^="/api/barbers/"]')).toHaveCount(0);
});

test("แอดมินยืนยันคิวที่รออยู่ได้", async ({ page }) => {
  await page.goto("/admin/bookings?status=pending&date=");
  const rows = page.locator("tbody tr");
  const before = await rows.count();
  expect(before).toBeGreaterThan(0);

  await rows.first().getByRole("button", { name: "ยืนยัน" }).click();
  await expect(rows).toHaveCount(before - 1);

  await page.goto("/admin/bookings?status=confirmed&date=");
  await expect(page.locator("tbody tr").first()).toContainText("ยืนยันแล้ว");
});

test("บันทึกวันลาแล้วลูกค้าจองช่างคนนั้นในวันนั้นไม่ได้", async ({ page }) => {
  const date = openDate(14);

  await page.goto("/admin/barbers");
  await page.locator("li", { hasText: "#" }).nth(1).getByRole("link", { name: /ตารางงาน/ }).click(); // ช่างบอส
  await expect(page.getByRole("heading", { name: "ตารางงาน: ช่างบอส" })).toBeVisible();

  await page.getByLabel("ตั้งแต่วันที่").fill(date);
  await page.getByLabel("ถึงวันที่").fill(date);
  await page.getByLabel("เหตุผล").fill("ไปงานแต่งเพื่อน");
  await page.getByRole("button", { name: "บันทึกวันลา" }).click();
  await expect(page.getByText("บันทึกวันลาเรียบร้อย")).toBeVisible();
  await expect(page.getByText("ไปงานแต่งเพื่อน")).toBeVisible();

  await pickBooking(page, { service: "ตัดผมชาย", barber: "ช่างบอส", date, path: "/admin/bookings/new" });
  await expect(page.getByTestId("slot-hint")).toContainText("ช่างบอสลางานวันนี้ (ไปงานแต่งเพื่อน)");
});

test("ปิดวันทำงานของช่างแล้วช่องเวลาหายไป", async ({ page }) => {
  const date = openDate(16);
  const weekdayName = new Intl.DateTimeFormat("th-TH", { weekday: "long", timeZone: "UTC" })
    .format(new Date(`${date}T00:00:00Z`))
    .replace("วัน", "");

  const saved = /บันทึกตารางงานเรียบร้อย|บันทึกแล้ว แต่/;

  await page.goto("/admin/barbers");
  await page.locator("li", { hasText: "#" }).nth(2).getByRole("link", { name: /ตารางงาน/ }).click(); // ช่างนัท
  await expect(page.getByRole("heading", { name: "ตารางงาน: ช่างนัท" })).toBeVisible();
  const schedulePage = page.url();
  const dayToggle = page.getByRole("checkbox", { name: weekdayName, exact: true });
  await dayToggle.uncheck();
  await page.getByRole("button", { name: "บันทึกตารางงาน" }).click();
  await expect(page.getByText(saved)).toBeVisible();

  await pickBooking(page, { service: "ตัดผมชาย", barber: "ช่างนัท", date, path: "/admin/bookings/new" });
  await expect(page.getByTestId("slot-hint")).toContainText("ช่างนัทไม่ได้เข้างานวันนี้");

  // คืนค่ากะงานเดิม เพื่อไม่ให้กระทบเทสต์อื่นที่ใช้ช่างนัท
  await page.goto(schedulePage);
  await dayToggle.check();
  await page.getByRole("button", { name: "บันทึกตารางงาน" }).click();
  await expect(page.getByText(saved)).toBeVisible();
});
