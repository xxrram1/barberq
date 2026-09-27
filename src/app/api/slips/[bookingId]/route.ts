import { desc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { bookings, paymentSlips } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

/** ส่งรูปสลิปให้เฉพาะเจ้าของคิวและแอดมินเท่านั้น */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/slips/[bookingId]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const bookingId = Number((await ctx.params).bookingId);
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    columns: { userId: true },
  });
  // ตอบ 404 เหมือนกันทั้งกรณีไม่มีคิวและไม่มีสิทธิ์ จะได้ไม่รู้ว่าคิวนั้นมีอยู่จริง
  if (!booking || (booking.userId !== user.id && user.role !== "admin")) {
    return new Response("Not found", { status: 404 });
  }

  const slip = await db.query.paymentSlips.findFirst({
    where: eq(paymentSlips.bookingId, bookingId),
    orderBy: desc(paymentSlips.id),
  });
  if (!slip) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(slip.data), {
    headers: {
      "Content-Type": slip.mimeType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
