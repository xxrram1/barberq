"use client";

import { useActionState } from "react";
import type { FormState } from "./actions";

export type CatalogField = {
  name: string;
  label: string;
  type?: "text" | "number";
  step?: number;
  placeholder?: string;
  wide?: boolean;
};

/** ฟอร์มเพิ่ม/แก้ไขข้อมูลแบบ inline ใช้ร่วมกันระหว่างหน้า "บริการ" และ "ช่าง" */
export function CatalogForm({
  action,
  fields,
  initial,
  submitLabel = "บันทึก",
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  fields: CatalogField[];
  initial?: { id: number; [key: string]: unknown };
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      {fields.map((f) => (
        <label key={f.name} className={f.wide ? "min-w-48 flex-[2]" : "w-28 flex-1"}>
          <span className="mb-1 block text-xs text-muted">{f.label}</span>
          <input
            name={f.name}
            type={f.type ?? "text"}
            step={f.step}
            min={f.type === "number" ? 0 : undefined}
            placeholder={f.placeholder}
            defaultValue={initial ? String(initial[f.name] ?? "") : undefined}
            className="input py-2"
          />
        </label>
      ))}
      <button type="submit" className={initial ? "btn-ghost" : "btn-primary"} disabled={pending}>
        {pending ? "กำลังบันทึก..." : submitLabel}
      </button>
      {state.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
      {state.ok && !pending && <p className="w-full text-xs text-emerald-700">บันทึกเรียบร้อย ✓</p>}
    </form>
  );
}
