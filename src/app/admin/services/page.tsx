import type { Metadata } from "next";
import { SubmitButton } from "@/components/ui";
import { db } from "@/db";
import { services } from "@/db/schema";
import { saveService, toggleService } from "../actions";
import { CatalogForm, type CatalogField } from "../catalog-form";

export const metadata: Metadata = { title: "บริการ" };

const FIELDS: CatalogField[] = [
  { name: "name", label: "ชื่อบริการ", placeholder: "เช่น ตัดผมชาย", wide: true },
  { name: "description", label: "รายละเอียด", placeholder: "อธิบายสั้นๆ", wide: true },
  { name: "durationMin", label: "เวลา (นาที)", type: "number", step: 15 },
  { name: "price", label: "ราคา (บาท)", type: "number", step: 10 },
];

export default async function AdminServicesPage() {
  const list = await db.query.services.findMany({ orderBy: services.id });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">บริการ</h1>
        <p className="text-sm text-muted">บริการที่ปิดไว้จะไม่แสดงให้ลูกค้าจอง แต่คิวเดิมยังอยู่ครบ</p>
      </div>

      <section className="card border-dashed p-5">
        <h2 className="mb-3 font-medium">+ เพิ่มบริการใหม่</h2>
        <CatalogForm action={saveService} fields={FIELDS} submitLabel="เพิ่มบริการ" />
      </section>

      <ul className="space-y-3">
        {list.map((s) => (
          <li key={s.id} className={`card p-5 ${s.active ? "" : "bg-stone-50 opacity-70"}`}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs text-muted">#{s.id} {s.active ? "" : "· ปิดให้บริการ"}</span>
              <form action={toggleService}>
                <input type="hidden" name="id" value={s.id} />
                <input type="hidden" name="active" value={String(!s.active)} />
                <SubmitButton className={s.active ? "btn-danger btn-sm" : "btn-brass btn-sm"} pendingText="...">
                  {s.active ? "ปิดบริการ" : "เปิดบริการ"}
                </SubmitButton>
              </form>
            </div>
            <CatalogForm action={saveService} fields={FIELDS} initial={s} />
          </li>
        ))}
      </ul>
    </div>
  );
}
