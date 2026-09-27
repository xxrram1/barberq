import { describe, expect, it } from "vitest";
import { normalizePhone, phoneSchema } from "./phone";

describe("phone", () => {
  it("ตัดช่องว่างและขีดออก", () => {
    expect(normalizePhone(" 081-234 5678 ")).toBe("0812345678");
  });
  it.each(["0812345678", "021234567", "081-234-5678"])("ยอมรับ %s", (v) => {
    expect(phoneSchema.safeParse(v).success).toBe(true);
  });
  it.each(["812345678", "08123", "0812345678901", "abc0812345"])("ปฏิเสธ %s", (v) => {
    expect(phoneSchema.safeParse(v).success).toBe(false);
  });
});
