import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
/** E2E ใช้ฐานข้อมูลแยกจากตอนพัฒนา จะได้ไม่ทับข้อมูลกัน */
const E2E_DB = "file:e2e.db";

export default defineConfig({
  testDir: "./e2e",
  // ทุกเทสต์ใช้ฐานข้อมูลเดียวกัน จึงรันทีละไฟล์เพื่อไม่ให้ข้อมูลตีกัน
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "th-TH",
    timezoneId: "Asia/Bangkok",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `node e2e/prepare-db.mjs && npx next build && npx next start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 240_000,
    // เริ่ม server ใหม่ทุกครั้ง เพื่อให้ได้ฐานข้อมูลที่สะอาด
    reuseExistingServer: false,
    env: {
      DATABASE_URL: E2E_DB,
      SESSION_SECRET: process.env.SESSION_SECRET ?? "e2e-only-secret-at-least-32-characters-long",
    },
  },
});
