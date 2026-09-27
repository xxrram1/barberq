import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { barberPhotos } from "@/db/schema";

/**
 * รูปโปรไฟล์ช่าง (สาธารณะ แสดงในหน้าแรกและหน้าจอง)
 * URL มี ?v=<photoVersion> ต่อท้ายเสมอ เปลี่ยนรูปแล้ว URL จะเปลี่ยนตาม จึง cache ได้ยาวแบบ immutable
 */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/barbers/[id]/photo">) {
  const barberId = Number((await ctx.params).id);
  if (!Number.isInteger(barberId)) return new Response("Not found", { status: 404 });

  const photo = await db.query.barberPhotos.findFirst({ where: eq(barberPhotos.barberId, barberId) });
  if (!photo) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(photo.data), {
    headers: {
      "Content-Type": photo.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
