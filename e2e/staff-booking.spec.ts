import { expect, test } from "@playwright/test";
import { login, openDate, pickBooking, USERS } from "./helpers";

const STAFF_PAGE = "/admin/bookings/new";

test("เมนูของแอดมินไม่มีเมนูลูกค้า และเข้าหน้าลูกค้าแล้วถูกพาไปหน้าร้าน", async ({ page }) => {
  await login(page, USERS.admin);
  const nav = page.getByRole("navigation").first();
  await expect(nav.getByRole("link", { name: "+ จองให้ลูกค้า" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "คิวของฉัน" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "จองคิว", exact: true })).toHaveCount(0);
  // footer ก็ต้องไม่มีลิงก์ของลูกค้า
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("link", { name: "คิวของฉัน" })).toHaveCount(0);
  await expect(footer.getByRole("link", { name: "จองให้ลูกค้า", exact: true })).toBeVisible();

  await page.goto("/book");
  await expect(page).toHaveURL(STAFF_PAGE);
  await page.goto("/bookings");
  await expect(page).toHaveURL("/admin/bookings");
});

test("ร้านจองให้ลูกค้า walk-in ที่ไม่มีบัญชี → ยืนยันทันที และช่องนั้นหายไปจากฝั่งลูกค้า", async ({ page, browser }) => {
  const date = openDate(22);
  await login(page, USERS.admin);
  await page.goto(STAFF_PAGE);

  await page.getByLabel("เบอร์โทรศัพท์").fill("089-999-9999");
  await page.getByLabel("ชื่อลูกค้า").click(); // ให้ช่องเบอร์ blur เพื่อค้นหาบัญชี
  await expect(page.getByTestId("member-hint")).toContainText("เติมชื่อให้อัตโนมัติ"); // ไม่พบบัญชี
  await page.getByLabel("ชื่อลูกค้า").fill("คุณวอล์คอิน");

  await pickBooking(page, { service: "ตัดผมชาย", barber: "ช่างนัท", date, path: STAFF_PAGE });
  const slot = page.locator("[data-slot]").first();
  const time = (await slot.textContent())!;
  await slot.click();
  await expect(page.getByRole("complementary")).toContainText("คุณวอล์คอิน");
  await page.screenshot({ path: "test-results/screens/staff-booking.png", fullPage: true });
  await page.getByRole("button", { name: "บันทึกคิวให้ลูกค้า" }).click();

  await expect(page).toHaveURL(/\/admin\/bookings\/\d+\?created=1/);
  await expect(page.getByText("ลูกค้าไม่มีบัญชี แจ้งเวลานัดทางโทรศัพท์")).toBeVisible();
  await expect(page.getByText("(ไม่มีบัญชี)")).toBeVisible();
  await expect(page.getByText("จองผ่านร้าน").first()).toBeVisible();
  await expect(page.getByText("ยืนยันแล้ว").first()).toBeVisible();
  await expect(page.getByText("คิวนี้ไม่มีมัดจำ")).toBeVisible();

  // ค้นหาด้วยเบอร์ลูกค้าที่ไม่มีบัญชีได้
  await page.goto("/admin/bookings?date=&q=0899999999");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr")).toContainText("คุณวอล์คอิน");

  // ลูกค้าออนไลน์เลือกเวลานั้นไม่ได้แล้ว
  const ctx = await browser.newContext();
  const customer = await ctx.newPage();
  await login(customer, USERS.demo);
  await pickBooking(customer, { service: "ตัดผมชาย", barber: "ช่างนัท", date });
  await expect(customer.locator("[data-slot]").first()).not.toHaveText(time);
  await ctx.close();
});

test("ร้านจองให้ลูกค้าที่มีบัญชี: เติมชื่อจากเบอร์ และคิวไปโผล่ในบัญชีลูกค้า", async ({ page, browser }) => {
  const date = openDate(23);
  await login(page, USERS.admin);
  await page.goto(STAFF_PAGE);

  await page.getByLabel("เบอร์โทรศัพท์").fill("0811111111"); // เบอร์ของบัญชี demo
  await page.getByLabel("ชื่อลูกค้า").click();
  await expect(page.getByLabel("ชื่อลูกค้า")).toHaveValue("ลูกค้าทดลอง");
  await expect(page.getByTestId("member-hint")).toContainText("ลูกค้ามีบัญชีอยู่แล้ว");

  await pickBooking(page, { service: "ตัดผม + โกนหนวด", barber: "ช่างนัท", date, path: STAFF_PAGE });
  await page.locator("[data-slot]").first().click();
  await page.getByRole("button", { name: "บันทึกคิวให้ลูกค้า" }).click();
  await expect(page.getByText("ลูกค้าเห็นคิวนี้ในบัญชีของตัวเองแล้ว")).toBeVisible();
  const id = new URL(page.url()).pathname.split("/").pop();

  const ctx = await browser.newContext();
  const customer = await ctx.newPage();
  await login(customer, USERS.demo);
  await customer.goto("/bookings");
  const card = customer.locator(`[data-booking-id="${id}"]`);
  await expect(card).toContainText("ตัดผม + โกนหนวด");
  await expect(card.getByText("จองผ่านร้าน")).toBeVisible();
  await expect(card.getByText("ยืนยันแล้ว")).toBeVisible();
  await expect(card.getByRole("link", { name: "ชำระมัดจำ" })).toHaveCount(0); // ร้านจองให้ไม่ต้องจ่ายมัดจำ
  await ctx.close();
});

test("ลูกค้าคนเดียวกันจองเวลาซ้อนกันไม่ได้ แม้ร้านเป็นคนจองให้", async ({ page }) => {
  const date = openDate(24);
  await login(page, USERS.admin);

  for (const barber of ["ช่างนัท", "ช่างบอส"]) {
    await page.goto(STAFF_PAGE);
    await page.getByLabel("เบอร์โทรศัพท์").fill("0877777777");
    await page.getByLabel("ชื่อลูกค้า").click();
    await page.getByLabel("ชื่อลูกค้า").fill("คุณซ้อน");
    await pickBooking(page, { service: "ตัดผมชาย", barber, date, path: STAFF_PAGE });
    await page.locator('[data-slot="840"]').click(); // 14:00 ทั้งสองช่างเข้างาน
    await page.getByRole("button", { name: "บันทึกคิวให้ลูกค้า" }).click();
    if (barber === "ช่างนัท") await expect(page).toHaveURL(/created=1/);
  }
  await expect(page.getByText("ลูกค้าคนนี้มีคิวอื่นที่เวลาทับซ้อนกันอยู่แล้ว")).toBeVisible();
});
