import type { Metadata } from "next";
import Link from "next/link";
import { SubmitButton } from "@/components/ui";
import { db } from "@/db";
import { barbers } from "@/db/schema";
import { saveBarber, toggleBarber } from "../actions";
import { CatalogForm, type CatalogField } from "../catalog-form";
import { PhotoUploader } from "./photo-uploader";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "ช่าง" };

const FIELDS: CatalogField[] = [
  { name: "name", label: "ชื่อช่าง", placeholder: "เช่น ช่างเอ็ม", wide: true },
  { name: "bio", label: "แนะนำตัว", placeholder: "ความถนัด ประสบการณ์", wide: true },
];

export default async function AdminBarbersPage() {
  await requireAdmin();
  const list = await db.query.barbers.findMany({ orderBy: barbers.id });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">ช่าง</h1>
        <p className="text-sm text-muted">ช่างที่พักงานจะไม่มีช่องเวลาให้ลูกค้าจอง</p>
      </div>

      <section className="card border-dashed p-5">
        <h2 className="mb-3 font-medium">+ เพิ่มช่างใหม่</h2>
        <CatalogForm action={saveBarber} fields={FIELDS} submitLabel="เพิ่มช่าง" />
      </section>

      <ul className="space-y-3">
        {list.map((b) => (
          <li key={b.id} className={`card p-5 ${b.active ? "" : "bg-stone-50 opacity-70"}`}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs text-muted">#{b.id} {b.active ? "" : "· พักงาน"}</span>
              <div className="flex items-center gap-2">
                <Link href={`/admin/barbers/${b.id}`} className="btn-ghost btn-sm">
                  🗓 ตารางงาน / วันลา
                </Link>
                <form action={toggleBarber}>
                  <input type="hidden" name="id" value={b.id} />
                  <input type="hidden" name="active" value={String(!b.active)} />
                  <SubmitButton className={b.active ? "btn-danger btn-sm" : "btn-brass btn-sm"} pendingText="...">
                    {b.active ? "พักงาน" : "กลับมาทำงาน"}
                  </SubmitButton>
                </form>
              </div>
            </div>
            <div className="mb-4 border-b border-line pb-4">
              <PhotoUploader barber={b} />
            </div>
            <CatalogForm action={saveBarber} fields={FIELDS} initial={b} />
          </li>
        ))}
      </ul>
    </div>
  );
}
