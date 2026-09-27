import type { Metadata } from "next";
import { AdminNav } from "./admin-nav";

export const metadata: Metadata = { title: { default: "หลังร้าน", template: "%s · หลังร้าน" } };

/**
 * layout ไม่ตรวจสิทธิ์เอง: ตอนสลับหน้าในส่วนแอดมิน Next.js ไม่ render layout ซ้ำ
 * การตรวจจึงอยู่ในทุก page (requireAdmin) และทุก server action แทน
 * ผลพลอยได้คือ layout ไม่อ่าน cookie ทำให้ loading.tsx แสดงได้ทันทีที่กดลิงก์
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <AdminNav />
      <div className="mt-8">{children}</div>
    </div>
  );
}
