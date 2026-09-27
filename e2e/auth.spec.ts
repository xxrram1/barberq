import { expect, test } from "@playwright/test";
import { appAlert, login, USERS } from "./helpers";

test("หน้าที่ต้องล็อกอินจะพาไปหน้าเข้าสู่ระบบ แล้วกลับมาหน้าเดิม", async ({ page }) => {
  await page.goto("/bookings");
  await expect(page).toHaveURL(/\/login\?next=%2Fbookings/);

  await page.getByLabel("อีเมล").fill(USERS.demo.email);
  await page.getByLabel("รหัสผ่าน").fill(USERS.demo.password);
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();

  await expect(page).toHaveURL("/bookings");
  await expect(page.getByRole("heading", { name: "คิวของฉัน" })).toBeVisible();
});

test("รหัสผ่านผิดต้องขึ้นข้อความแจ้ง และไม่บอกว่าอีเมลมีในระบบหรือไม่", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("อีเมล").fill(USERS.demo.email);
  await page.getByLabel("รหัสผ่าน").fill("wrong-password");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();

  await expect(appAlert(page)).toHaveText("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
  await expect(page).toHaveURL(/\/login/);
});

test("สมัครสมาชิกใหม่ ตรวจข้อมูลผิด แล้วสมัครสำเร็จและออกจากระบบได้", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("ชื่อ-นามสกุล").fill("ทดสอบ อีทูอี");
  await page.getByLabel("อีเมล").fill(`e2e-${Date.now()}@example.com`);
  await page.getByLabel("เบอร์โทรศัพท์").fill("12345");
  await page.getByLabel("รหัสผ่าน", { exact: true }).fill("password123");
  await page.getByLabel("ยืนยันรหัสผ่าน").fill("different");
  await page.getByRole("button", { name: "สมัครสมาชิก" }).click();

  await expect(page.getByText("เบอร์โทรไม่ถูกต้อง")).toBeVisible();
  await expect(page.getByText("รหัสผ่านไม่ตรงกัน")).toBeVisible();

  await page.getByLabel("เบอร์โทรศัพท์").fill("081-234-5678");
  await page.getByLabel("รหัสผ่าน", { exact: true }).fill("password123");
  await page.getByLabel("ยืนยันรหัสผ่าน").fill("password123");
  await page.getByRole("button", { name: "สมัครสมาชิก" }).click();

  await expect(page).toHaveURL("/");
  await page.locator("summary").click(); // เมนูผู้ใช้
  await expect(page.getByText("ทดสอบ อีทูอี")).toBeVisible();
  await page.getByRole("button", { name: "ออกจากระบบ" }).click();
  await expect(page.getByRole("link", { name: "เข้าสู่ระบบ" })).toBeVisible();
});

test("ลูกค้าทั่วไปเข้าหน้าหลังร้านไม่ได้", async ({ page }) => {
  await login(page, USERS.demo);
  await page.goto("/admin");
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("link", { name: "หลังร้าน" })).toHaveCount(0);
});
