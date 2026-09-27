import { expect, test, type Page } from "@playwright/test";
import QRCode from "qrcode";
import { appAlert, login, openDate, pickBooking, USERS } from "./helpers";

async function bookAndOpenDetail(page: Page, dateOffset: number) {
  await login(page, USERS.demo);
  await pickBooking(page, { service: "ตัดผมชาย", barber: "ช่างนัท", date: openDate(dateOffset) });
  await page.locator("[data-slot]").first().click();
  await page.getByRole("button", { name: "ยืนยันการจอง" }).click();
  await expect(page).toHaveURL(/\/bookings\/\d+\?booked=1/);
  return new URL(page.url()).pathname.split("/").pop()!;
}

test("จ่ายมัดจำด้วย PromptPay → ส่งสลิป → แอดมินยืนยัน → คิวถูกยืนยันอัตโนมัติ", async ({ page, browser }) => {
  const id = await bookAndOpenDetail(page, 18);

  // หน้ารายละเอียดมี QR พร้อมเพย์และยอดมัดจำ
  const payment = page.getByRole("complementary");
  await expect(payment.getByRole("img", { name: /QR พร้อมเพย์ ยอด 100 บาท/ })).toBeVisible();
  await expect(payment.getByText("฿100")).toBeVisible();
  await expect(page.getByText("ยังไม่ชำระมัดจำ")).toBeVisible();
  await page.screenshot({ path: "test-results/screens/booking-detail.png", fullPage: true });

  // อัปโหลดสลิป (สร้างรูป PNG ขึ้นมาแทนสลิปจริง)
  const slip = await QRCode.toBuffer("slip for e2e", { width: 600 });
  await page.locator('input[type="file"]').setInputFiles({ name: "slip.png", mimeType: "image/png", buffer: slip });
  await expect(page.getByAltText("ตัวอย่างสลิป")).toBeVisible();
  await page.getByRole("button", { name: "ส่งสลิป" }).click();
  await expect(page.getByText("ส่งสลิปเรียบร้อย รอร้านตรวจสอบ")).toBeVisible();
  await expect(page.getByText("รอตรวจสลิป").first()).toBeVisible();

  // แอดมินตรวจสลิป
  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await login(admin, USERS.admin);
  await expect(admin.getByRole("heading", { name: /รอตรวจสลิป/ })).toBeVisible();
  await admin.goto(`/admin/bookings/${id}`);
  const img = admin.getByAltText(`สลิปของคิว #${id}`);
  await expect(img).toBeVisible();
  expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  await admin.screenshot({ path: "test-results/screens/admin-slip.png", fullPage: true });
  await admin.getByRole("button", { name: /ยอดเข้าแล้ว ยืนยันคิว/ }).click();
  await expect(admin.getByText("ชำระมัดจำแล้ว")).toBeVisible();
  await expect(admin.getByText("ยืนยันแล้ว").first()).toBeVisible();
  await adminCtx.close();

  // ลูกค้าเห็นสถานะอัปเดต
  await page.reload();
  await expect(page.getByText("ร้านได้รับมัดจำแล้ว")).toBeVisible();
  await expect(page.getByText("ยืนยันแล้ว").first()).toBeVisible();
});

test("แอดมินปฏิเสธสลิป ลูกค้าส่งใหม่ได้", async ({ page, browser }) => {
  const id = await bookAndOpenDetail(page, 19);
  const slip = await QRCode.toBuffer("bad slip", { width: 300 });
  await page.locator('input[type="file"]').setInputFiles({ name: "slip.png", mimeType: "image/png", buffer: slip });
  await page.getByRole("button", { name: "ส่งสลิป" }).click();
  await expect(page.getByText("ส่งสลิปเรียบร้อย")).toBeVisible();

  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await login(admin, USERS.admin);
  await admin.goto(`/admin/bookings/${id}`);
  await admin.getByRole("button", { name: "สลิปไม่ถูกต้อง" }).click();
  await expect(admin.getByText("สลิปไม่ผ่าน")).toBeVisible();
  await adminCtx.close();

  await page.reload();
  await expect(page.getByText("สลิปไม่ถูกต้อง กรุณาโอนและส่งสลิปใหม่")).toBeVisible();
  await expect(page.getByText("เลือกสลิปใหม่")).toBeVisible();
});

test("คนอื่นดูสลิปและรายละเอียดคิวของเราไม่ได้", async ({ page, browser }) => {
  const id = await bookAndOpenDetail(page, 20);
  const slip = await QRCode.toBuffer("private slip", { width: 300 });
  await page.locator('input[type="file"]').setInputFiles({ name: "slip.png", mimeType: "image/png", buffer: slip });
  await page.getByRole("button", { name: "ส่งสลิป" }).click();
  await expect(page.getByText("ส่งสลิปเรียบร้อย")).toBeVisible();

  // เจ้าของเปิดสลิปได้
  expect((await page.request.get(`/api/slips/${id}`)).status()).toBe(200);

  // ลูกค้าคนอื่นเปิดไม่ได้
  const otherCtx = await browser.newContext();
  const other = await otherCtx.newPage();
  await login(other, USERS.somchai);
  expect((await other.request.get(`/api/slips/${id}`)).status()).toBe(404);
  const res = await other.goto(`/bookings/${id}`);
  expect(res?.status()).toBe(404);
  await otherCtx.close();

  // ไม่ได้ล็อกอินก็เปิดไม่ได้
  const anonCtx = await browser.newContext();
  expect((await anonCtx.request.get(`/api/slips/${id}`)).status()).toBe(401);
  await anonCtx.close();
});

test("ไฟล์ที่ไม่ใช่รูปภาพถูกปฏิเสธ", async ({ page }) => {
  await bookAndOpenDetail(page, 21);
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "evil.png", mimeType: "image/png", buffer: Buffer.from("<svg onload=alert(1)>") });
  await page.getByRole("button", { name: "ส่งสลิป" }).click();
  await expect(appAlert(page)).toContainText("อ่านไฟล์รูปไม่ได้");
});
