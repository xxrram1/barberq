/**
 * ย่อรูปในเบราว์เซอร์ก่อนอัปโหลด (รูปจากมือถือมักใหญ่หลาย MB)
 * ลดคุณภาพ JPEG ทีละขั้นจนไฟล์เล็กกว่า maxBytes
 * @param square ตัดเป็นสี่เหลี่ยมจัตุรัสจากกึ่งกลาง (ใช้กับรูปโปรไฟล์)
 */
export async function compressImage(
  file: File,
  opts: { maxSide: number; maxBytes: number; square?: boolean; name?: string },
): Promise<File> {
  const bitmap = await createImageBitmap(file);

  // พื้นที่ของรูปต้นฉบับที่จะใช้ (ตัดขอบให้เป็นจัตุรัสถ้าต้องการ)
  const side = Math.min(bitmap.width, bitmap.height);
  const src = opts.square
    ? { x: (bitmap.width - side) / 2, y: (bitmap.height - side) / 2, w: side, h: side }
    : { x: 0, y: 0, w: bitmap.width, h: bitmap.height };

  const scale = Math.min(1, opts.maxSide / Math.max(src.w, src.h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(src.w * scale);
  canvas.height = Math.round(src.h * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; // พื้นหลังขาวสำหรับ PNG โปร่งใส
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, src.x, src.y, src.w, src.h, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  for (const quality of [0.85, 0.7, 0.55, 0.4]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= opts.maxBytes) {
      return new File([blob], opts.name ?? "image.jpg", { type: "image/jpeg" });
    }
  }
  throw new Error("too-large");
}
