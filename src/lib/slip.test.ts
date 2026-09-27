import { describe, expect, it } from "vitest";
import { sniffImageType } from "./slip";

const bytes = (...b: number[]) => new Uint8Array([...b, 0, 0, 0, 0, 0, 0, 0, 0]);
const ascii = (s: string) => new TextEncoder().encode(s);

describe("sniffImageType", () => {
  it("รู้จัก JPEG", () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
  });
  it("รู้จัก PNG", () => {
    expect(sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
  });
  it("รู้จัก WebP", () => {
    expect(sniffImageType(ascii("RIFF\x00\x00\x00\x00WEBPVP8 "))).toBe("image/webp");
  });
  it("ปฏิเสธ SVG / HTML แม้จะตั้งชื่อเป็นรูป", () => {
    expect(sniffImageType(ascii("<svg onload=alert(1)>"))).toBeNull();
    expect(sniffImageType(ascii("<!DOCTYPE html><script>"))).toBeNull();
  });
  it("ปฏิเสธไฟล์ว่างหรือสั้นเกินไป", () => {
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });
  it("ปฏิเสธไฟล์ RIFF ที่ไม่ใช่ WebP (เช่น WAV)", () => {
    expect(sniffImageType(ascii("RIFF\x00\x00\x00\x00WAVEfmt "))).toBeNull();
  });
});
