"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FieldError } from "@/components/ui";
import { login, register, type AuthState } from "./actions";

type Field = { name: string; label: string; type?: string; placeholder?: string; autoComplete?: string };

const FIELDS: Record<"login" | "register", Field[]> = {
  login: [
    { name: "email", label: "อีเมล", type: "email", placeholder: "you@example.com", autoComplete: "email" },
    { name: "password", label: "รหัสผ่าน", type: "password", autoComplete: "current-password" },
  ],
  register: [
    { name: "name", label: "ชื่อ-นามสกุล", placeholder: "สมชาย ใจดี", autoComplete: "name" },
    { name: "email", label: "อีเมล", type: "email", placeholder: "you@example.com", autoComplete: "email" },
    { name: "phone", label: "เบอร์โทรศัพท์", type: "tel", placeholder: "0812345678", autoComplete: "tel" },
    { name: "password", label: "รหัสผ่าน", type: "password", placeholder: "อย่างน้อย 8 ตัวอักษร", autoComplete: "new-password" },
    { name: "confirm", label: "ยืนยันรหัสผ่าน", type: "password", autoComplete: "new-password" },
  ],
};

export function AuthForm({ mode, next }: { mode: "login" | "register"; next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? login : register, {});
  const nextQuery = next !== "/" ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12 sm:py-20">
      <div className="card p-6 shadow-sm sm:p-8">
        <h1 className="font-display text-2xl font-semibold">
          {mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {mode === "login" ? "ยินดีต้อนรับกลับมา! เข้าสู่ระบบเพื่อจองคิว" : "สมัครฟรี ใช้เวลาไม่ถึงนาที"}
        </p>

        {state.error && (
          <div role="alert" className="mt-5 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {state.error}
          </div>
        )}

        <form action={action} className="mt-6 space-y-4" noValidate>
          <input type="hidden" name="next" value={next} />
          {FIELDS[mode].map((f) => (
            <div key={f.name}>
              <label htmlFor={f.name} className="label">
                {f.label}
              </label>
              <input
                id={f.name}
                name={f.name}
                type={f.type ?? "text"}
                placeholder={f.placeholder}
                autoComplete={f.autoComplete}
                defaultValue={state.values?.[f.name]}
                aria-invalid={!!state.fieldErrors?.[f.name]}
                className="input aria-invalid:border-red-400"
                required
              />
              <FieldError errors={state.fieldErrors?.[f.name]} />
            </div>
          ))}
          <button type="submit" className="btn-primary w-full" disabled={pending}>
            {pending ? "กำลังดำเนินการ..." : mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          {mode === "login" ? (
            <>
              ยังไม่มีบัญชี?{" "}
              <Link href={`/register${nextQuery}`} className="font-medium text-brass hover:underline">
                สมัครสมาชิก
              </Link>
            </>
          ) : (
            <>
              มีบัญชีอยู่แล้ว?{" "}
              <Link href={`/login${nextQuery}`} className="font-medium text-brass hover:underline">
                เข้าสู่ระบบ
              </Link>
            </>
          )}
        </p>
      </div>

      {mode === "login" && (
        <div className="mt-4 rounded-xl border border-dashed border-line bg-white/60 p-4 text-xs text-muted">
          <div className="mb-1 font-medium text-stone-700">🔑 บัญชีทดลอง</div>
          ลูกค้า: demo@barberq.dev / demo1234
          <br />
          แอดมิน: admin@barberq.dev / admin1234
        </div>
      )}
    </div>
  );
}
