/** ขนาดสลิปสูงสุดหลังย่อรูปแล้ว (server action รับ body ได้ไม่เกิน 1MB) */
export const MAX_SLIP_BYTES = 800 * 1024;

/** รูปโปรไฟล์ช่างถูกย่อเป็นจัตุรัส 512px แล้ว ไม่ควรเกินนี้ */
export const MAX_PHOTO_BYTES = 300 * 1024;

export type SlipMime = "image/jpeg" | "image/png" | "image/webp";

/**
 * ตรวจชนิดรูปจาก magic bytes ของไฟล์จริง ไม่เชื่อ MIME type หรือนามสกุลที่ browser ส่งมา
 * (กันการแอบอัปโหลดไฟล์อื่น เช่น HTML หรือ SVG ที่มีสคริปต์ โดยตั้งชื่อเป็น .jpg)
 */
export function sniffImageType(bytes: Uint8Array): SlipMime | null {
  const starts = (sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);
  if (starts([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  // RIFF....WEBP
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  return null;
}
