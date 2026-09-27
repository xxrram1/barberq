import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { findSlots } from "@/lib/availability";
import { dateError } from "@/lib/slots";
import { shopNow } from "@/lib/time";

const querySchema = z.object({
  serviceId: z.coerce.number().int().positive(),
  barberId: z.union([z.literal("any"), z.coerce.number().int().positive()]),
  date: z.string(),
  staff: z.literal("1").optional(),
});

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "พารามิเตอร์ไม่ถูกต้อง" }, { status: 400 });
  }
  const { staff, ...query } = parsed.data;

  const now = shopNow();
  const reason = dateError(query.date, now);
  if (reason) return NextResponse.json({ slots: [], reason });

  // โหมดร้าน (จองได้ทันทีไม่ต้องล่วงหน้า) ใช้ได้เฉพาะแอดมินจริงเท่านั้น
  const isStaff = staff === "1" && (await getCurrentUser())?.role === "admin";

  const { service, slots, reason: barberReason } = await findSlots(query, undefined, { staff: isStaff });
  if (!service) return NextResponse.json({ error: "ไม่พบบริการนี้" }, { status: 404 });

  return NextResponse.json({
    slots: slots.map((s) => s.startMin),
    reason:
      slots.length > 0
        ? undefined
        : (barberReason ??
          (query.date === now.date ? "ช่วงเวลาที่เหลือของวันนี้เต็มหรือเลยเวลาจองแล้ว ลองเลือกวันอื่นนะ" : undefined)),
  });
}
