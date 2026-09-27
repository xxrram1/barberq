"use client";

import { startTransition, useActionState, useState, useTransition } from "react";
import { BarberAvatar } from "@/components/barber-avatar";
import { ConfirmButton } from "@/components/ui";
import { compressImage } from "@/lib/image-client";
import { MAX_PHOTO_BYTES } from "@/lib/slip";
import { removeBarberPhoto, uploadBarberPhoto, type FormState } from "../actions";

export function PhotoUploader({ barber }: { barber: { id: number; name: string; photoVersion: number } }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(uploadBarberPhoto, {});
  const [clientError, setClientError] = useState<string | null>(null);
  const [preparing, startPreparing] = useTransition();
  const busy = pending || preparing;

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <BarberAvatar barber={barber} className="size-16 text-xl" />
        {busy && (
          <span className="absolute inset-0 grid place-items-center rounded-full bg-white/70 text-xs">...</span>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <label className={`btn-ghost btn-sm cursor-pointer ${busy ? "pointer-events-none opacity-50" : ""}`}>
            📷 {barber.photoVersion > 0 ? "เปลี่ยนรูป" : "เพิ่มรูป"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              aria-label={`อัปโหลดรูปของ${barber.name}`}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = ""; // เลือกไฟล์เดิมซ้ำได้
                if (!file) return;
                setClientError(null);
                startPreparing(async () => {
                  try {
                    // ตัดเป็นจัตุรัสกึ่งกลาง 512px พอสำหรับแสดงเป็นวงกลมทุกขนาด
                    const photo = await compressImage(file, {
                      maxSide: 512,
                      maxBytes: MAX_PHOTO_BYTES,
                      square: true,
                      name: "photo.jpg",
                    });
                    const fd = new FormData();
                    fd.set("barberId", String(barber.id));
                    fd.set("photo", photo);
                    startTransition(() => formAction(fd));
                  } catch {
                    setClientError("อ่านไฟล์รูปไม่ได้ ลองใช้ไฟล์ JPG หรือ PNG");
                  }
                });
              }}
            />
          </label>
          {barber.photoVersion > 0 && (
            <form action={removeBarberPhoto}>
              <input type="hidden" name="barberId" value={barber.id} />
              <ConfirmButton message={`ลบรูปของ${barber.name}?`}>ลบรูป</ConfirmButton>
            </form>
          )}
        </div>
        {(clientError || state.error) && <p className="text-xs text-red-600">{clientError ?? state.error}</p>}
        {state.ok && !busy && <p className="text-xs text-emerald-700">อัปเดตรูปแล้ว ✓</p>}
        {!clientError && !state.error && !state.ok && (
          <p className="text-xs text-muted">ระบบจะตัดเป็นสี่เหลี่ยมจัตุรัสจากกึ่งกลางรูปให้</p>
        )}
      </div>
    </div>
  );
}
