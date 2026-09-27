import { expect, test } from "@playwright/test";
import { confirmDialog, login, openDate, pickBooking, toast, USERS } from "./helpers";

test("ลูกค้าจองคิวได้ และยกเลิกคิวเองได้", async ({ page }) => {
  const date = openDate(10);
  await login(page, USERS.demo);
  await pickBooking(page, { service: "ตัดผมชาย", barber: "ช่างนัท", date });

  const slot = page.locator("[data-slot]").first();
  const time = await slot.textContent();
  await slot.click();
  await expect(page.getByRole("complementary")).toContainText(`${time}–`); // สรุปการจองแสดงเวลาที่เลือก
  await page.getByRole("button", { name: "ยืนยันการจอง" }).click();

  await expect(page).toHaveURL(/\/bookings\/\d+\?booked=1/);
  const bookingId = new URL(page.url()).pathname.split("/").pop();
  await expect(page.getByText("จองคิวสำเร็จ!")).toBeVisible();

  // ช่องที่จองไปแล้วต้องหายไปจากหน้าจอง
  await pickBooking(page, { service: "ตัดผมชาย", barber: "ช่างนัท", date });
  await expect(page.locator("[data-slot]").first()).not.toHaveText(time!);

  // ยกเลิกคิว (มี confirm dialog)
  await page.goto("/bookings");
  const card = page.locator(`[data-booking-id="${bookingId}"]`);
  await card.getByRole("button", { name: "ยกเลิก" }).click();
  await confirmDialog(page, "ยกเลิกคิว");
  await expect(toast(page, "ยกเลิกคิวเรียบร้อยแล้ว")).toBeVisible();
  // ย้ายไปอยู่ในประวัติ พร้อมสถานะ "ยกเลิก" และไม่มีปุ่มให้กดแล้ว
  await expect(card.getByText("ยกเลิก", { exact: true })).toBeVisible();
  await expect(card.getByRole("button")).toHaveCount(0);
});

test("สองคนกดจองช่องเดียวกันพร้อมกัน ต้องสำเร็จแค่คนเดียว", async ({ browser }) => {
  const date = openDate(12);
  const [ctxA, ctxB] = await Promise.all([browser.newContext(), browser.newContext()]);
  const [a, b] = await Promise.all([ctxA.newPage(), ctxB.newPage()]);

  await Promise.all([login(a, USERS.demo), login(b, USERS.somchai)]);
  await Promise.all([
    pickBooking(a, { service: "ตัดผมชาย", barber: "ช่างนัท", date }),
    pickBooking(b, { service: "ตัดผมชาย", barber: "ช่างนัท", date }),
  ]);

  // ทั้งคู่เลือกช่องแรกที่ว่าง (ช่องเดียวกัน) แล้วกดยืนยันพร้อมกัน
  await a.locator("[data-slot]").first().click();
  await b.locator("[data-slot]").first().click();
  await Promise.all([
    a.getByRole("button", { name: "ยืนยันการจอง" }).click(),
    b.getByRole("button", { name: "ยืนยันการจอง" }).click(),
  ]);

  const outcome = async (p: typeof a) => {
    const success = p.getByText("จองคิวสำเร็จ!");
    const conflict = p.getByText("ช่วงเวลานี้เพิ่งถูกจองไป");
    await expect(success.or(conflict)).toBeVisible();
    return (await success.isVisible()) ? "success" : "conflict";
  };
  const results = await Promise.all([outcome(a), outcome(b)]);
  expect(results.sort()).toEqual(["conflict", "success"]);

  await Promise.all([ctxA.close(), ctxB.close()]);
});

test("วันที่ร้านปิดเลือกไม่ได้", async ({ page }) => {
  await login(page, USERS.demo);
  await page.goto("/book");
  await expect(page.locator("[data-date]:disabled").first()).toContainText("ปิด");
});
