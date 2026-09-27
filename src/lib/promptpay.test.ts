import { describe, expect, it } from "vitest";
import { crc16, promptPayPayload } from "./promptpay";

/** แยกข้อความ EMVCo กลับเป็นช่องข้อมูล เพื่อตรวจโครงสร้าง */
function parse(payload: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < payload.length; ) {
    const id = payload.slice(i, i + 2);
    const len = Number(payload.slice(i + 2, i + 4));
    out[id] = payload.slice(i + 4, i + 4 + len);
    i += 4 + len;
  }
  return out;
}

describe("crc16", () => {
  it("ตรงกับค่ามาตรฐานของ CRC-16/CCITT-FALSE", () => {
    expect(crc16("123456789")).toBe("29B1");
  });
});

describe("promptPayPayload", () => {
  // ค่าอ้างอิงที่สร้างจาก library promptpay-qr (ใช้กันแพร่หลาย) เพื่อยืนยันว่าแอปธนาคารสแกนได้จริง
  it.each([
    ["0812345678", 100, "00020101021229370016A000000677010111011300668123456785802TH53037645406100.006304BB8A"],
    ["0812345678", 250.5, "00020101021229370016A000000677010111011300668123456785802TH53037645406250.5063043E88"],
    ["1234567890123", 1200, "00020101021229370016A000000677010111021312345678901235802TH530376454071200.006304939A"],
    ["0812345678", undefined, "00020101021129370016A000000677010111011300668123456785802TH530376463045D82"],
  ])("ตรงกับค่าอ้างอิง: %s ยอด %s", (id, amount, expected) => {
    expect(promptPayPayload(id, amount)).toBe(expected);
  });

  it("เบอร์มือถือถูกแปลงเป็นรูปแบบ 0066", () => {
    const f = parse(promptPayPayload("081-234-5678"));
    expect(f["29"]).toBe("0016A000000677010111" + "0113" + "0066812345678");
  });

  it("เลขบัตรประชาชน 13 หลักใช้ช่องข้อมูลย่อย 02", () => {
    const f = parse(promptPayPayload("1234567890123"));
    expect(f["29"]).toContain("02131234567890123");
  });

  it("ใส่ยอดเงินเป็นทศนิยม 2 ตำแหน่ง และเป็น QR แบบใช้ครั้งเดียว", () => {
    const f = parse(promptPayPayload("0812345678", 100));
    expect(f["54"]).toBe("100.00");
    expect(f["01"]).toBe("12");
    expect(f["53"]).toBe("764");
    expect(f["58"]).toBe("TH");
  });

  it("ไม่ใส่ยอดเงินจะเป็น QR ที่ใช้ซ้ำได้", () => {
    const f = parse(promptPayPayload("0812345678"));
    expect(f["54"]).toBeUndefined();
    expect(f["01"]).toBe("11");
  });

  it("CRC ท้ายข้อความถูกต้อง", () => {
    const payload = promptPayPayload("0812345678", 250.5);
    expect(payload.slice(-8, -4)).toBe("6304");
    expect(crc16(payload.slice(0, -4))).toBe(payload.slice(-4));
  });

  it("ปฏิเสธรหัสพร้อมเพย์และยอดเงินที่ไม่ถูกต้อง", () => {
    expect(() => promptPayPayload("12345")).toThrow();
    expect(() => promptPayPayload("0812345678", -5)).toThrow();
  });
});
