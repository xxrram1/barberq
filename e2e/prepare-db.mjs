// สร้างฐานข้อมูล E2E ใหม่ทุกครั้งก่อนเปิด server: ลบไฟล์เก่า → สร้างตาราง → ใส่ข้อมูลตัวอย่าง
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

const env = { ...process.env, DATABASE_URL: "file:e2e.db" };
rmSync("e2e.db", { force: true });
execSync("npx drizzle-kit push --force", { env, stdio: "inherit" });
execSync("npx tsx src/db/seed.ts", { env, stdio: "inherit" });
