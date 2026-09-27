"use client";

import { startTransition, useActionState, useState, useTransition } from "react";
import { compressImage } from "@/lib/image-client";
import { MAX_SLIP_BYTES } from "@/lib/slip";
import { uploadSlip, type SlipState } from "../actions";

export function SlipUploader({ bookingId, resubmit }: { bookingId: number; resubmit?: boolean }) {
  const [state, formAction, pending] = useActionState<SlipState, FormData>(uploadSlip, {});
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [compressing, startCompress] = useTransition();

  const busy = pending || compressing;

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!file) return setClientError("กรุณาเลือกรูปสลิป");
        setClientError(null);
        startCompress(async () => {
          try {
            const small = await compressImage(file, { maxSide: 1280, maxBytes: MAX_SLIP_BYTES, name: "slip.jpg" });
            const fd = new FormData();
            fd.set("bookingId", String(bookingId));
            fd.set("slip", small);
            // หลัง await จะหลุดออกจาก transition เดิม ต้องครอบใหม่ก่อนเรียก action
            startTransition(() => formAction(fd));
          } catch {
            setClientError("อ่านไฟล์รูปไม่ได้ หรือรูปใหญ่เกินไป ลองใช้ภาพหน้าจอสลิปแทน");
          }
        });
      }}
    >
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-paper px-4 py-6 text-center transition hover:border-brass">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- blob URL ของไฟล์ในเครื่อง ใช้ next/image ไม่ได้
          <img src={preview} alt="ตัวอย่างสลิป" className="max-h-56 rounded-lg shadow-sm" />
        ) : (
          <>
            <span className="text-2xl">🧾</span>
            <span className="text-sm font-medium">{resubmit ? "เลือกสลิปใหม่" : "แตะเพื่อเลือกรูปสลิป"}</span>
            <span className="text-xs text-muted">JPG / PNG / WebP</span>
          </>
        )}
        <input
          type="file"
          name="slip"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            if (preview) URL.revokeObjectURL(preview);
            setPreview(f ? URL.createObjectURL(f) : null);
          }}
        />
      </label>

      {(clientError || state.error) && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {clientError ?? state.error}
        </p>
      )}
      {state.ok && !busy && <p className="text-sm text-emerald-700">ส่งสลิปเรียบร้อย รอร้านตรวจสอบ ✓</p>}

      <button type="submit" className="btn-brass w-full" disabled={!file || busy}>
        {compressing ? "กำลังเตรียมรูป..." : pending ? "กำลังส่ง..." : "ส่งสลิป"}
      </button>
    </form>
  );
}
