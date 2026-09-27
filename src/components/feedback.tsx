"use client";

/**
 * ระบบแจ้งเตือนของทั้งเว็บ
 * - toast: กล่องข้อความมุมจอหลังบันทึก/ผิดพลาด หายไปเองใน 4 วินาที
 * - confirm: หน้าต่างยืนยันก่อนทำสิ่งที่ย้อนกลับยาก (ใช้ <dialog> ของเบราว์เซอร์ จึงกด Esc ปิดได้และโฟกัสไม่หลุด)
 * - ActionForm: ฟอร์มที่เรียก server action แล้วถามยืนยัน/แสดง toast ให้อัตโนมัติ
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; message: string };

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  /** true = การกระทำที่ทำลายข้อมูล ปุ่มยืนยันเป็นสีแดง */
  danger?: boolean;
};

type Feedback = {
  toast: Record<ToastKind, (message: string) => void>;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
};

const FeedbackContext = createContext<Feedback | null>(null);

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useFeedback ต้องอยู่ภายใน <FeedbackProvider>");
  return ctx;
}

const TOAST_MS = 4000;

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState<{ opts: ConfirmOptions; resolve: (ok: boolean) => void } | null>(null);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = ++nextId.current;
      setToasts((list) => [...list.slice(-2), { id, kind, message }]); // แสดงพร้อมกันไม่เกิน 3 อัน
      setTimeout(() => dismiss(id), TOAST_MS);
    },
    [dismiss],
  );

  const [value] = useState<Feedback>(() => ({
    toast: {
      success: (m) => push("success", m),
      error: (m) => push("error", m),
      info: (m) => push("info", m),
    },
    confirm: (opts) => new Promise<boolean>((resolve) => setPending({ opts, resolve })),
  }));

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
      {pending && (
        <ConfirmDialog
          opts={pending.opts}
          onClose={(ok) => {
            pending.resolve(ok);
            setPending(null);
          }}
        />
      )}
    </FeedbackContext.Provider>
  );
}

const TOAST_STYLE: Record<ToastKind, { icon: string; className: string }> = {
  success: { icon: "✓", className: "bg-emerald-600" },
  error: { icon: "!", className: "bg-red-600" },
  info: { icon: "i", className: "bg-ink" },
};

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.kind === "error" ? "alert" : "status"}
          data-toast={t.kind}
          className="toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line bg-white p-3.5 text-sm shadow-lg"
        >
          <span
            aria-hidden
            className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${TOAST_STYLE[t.kind].className}`}
          >
            {TOAST_STYLE[t.kind].icon}
          </span>
          <p className="flex-1 pt-0.5">{t.message}</p>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            aria-label="ปิดการแจ้งเตือน"
            className="-m-1 rounded p-1 text-muted hover:text-ink"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

function ConfirmDialog({ opts, onClose }: { opts: ConfirmOptions; onClose: (ok: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      aria-describedby={opts.message ? "confirm-message" : undefined}
      onCancel={(e) => {
        e.preventDefault(); // Esc = ยกเลิก
        onClose(false);
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(false); // คลิกพื้นหลัง = ยกเลิก
      }}
      className="dialog-in m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/50 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className={`grid size-10 shrink-0 place-items-center rounded-full text-lg ${
              opts.danger ? "bg-red-50 text-red-600" : "bg-brass-soft text-brass-dark"
            }`}
          >
            {opts.danger ? "!" : "?"}
          </span>
          <div>
            <h2 id="confirm-title" className="font-display text-lg font-semibold">
              {opts.title}
            </h2>
            {opts.message && (
              <p id="confirm-message" className="mt-1 text-sm text-muted">
                {opts.message}
              </p>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" autoFocus className="btn-ghost" onClick={() => onClose(false)}>
            ยกเลิก
          </button>
          <button
            type="button"
            className={opts.danger ? "btn bg-red-600 text-white hover:bg-red-700" : "btn-primary"}
            onClick={() => onClose(true)}
          >
            {opts.confirmLabel ?? "ยืนยัน"}
          </button>
        </div>
      </div>
    </dialog>
  );
}

type ActionResult = void | { error?: string } | undefined;

/**
 * ฟอร์มสำหรับ server action ที่ไม่ต้องแสดงผลในฟอร์ม (เช่น ปุ่มยืนยัน/ยกเลิก/ลบ)
 * - confirm: ถามก่อนส่ง
 * - success: ข้อความ toast เมื่อสำเร็จ (action คืน { error } เมื่อทำไม่ได้ จะแสดงเป็น toast สีแดงแทน)
 */
export function ActionForm({
  action,
  success,
  confirm,
  className,
  children,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  success?: string;
  confirm?: ConfirmOptions;
  className?: string;
  children: React.ReactNode;
}) {
  const feedback = useFeedback();
  const confirmed = useRef(false);

  return (
    <form
      className={className}
      onSubmit={async (e) => {
        if (!confirm || confirmed.current) return;
        e.preventDefault(); // หยุดไว้ก่อน ถามให้แน่ใจแล้วค่อยส่งใหม่
        const form = e.currentTarget;
        if (await feedback.confirm(confirm)) {
          confirmed.current = true;
          form.requestSubmit();
        }
      }}
      action={async (formData) => {
        confirmed.current = false;
        try {
          const result = await action(formData);
          if (result && result.error) feedback.toast.error(result.error);
          else if (success) feedback.toast.success(success);
        } catch (err) {
          // redirect()/notFound() จาก server action ต้องปล่อยให้ Next.js จัดการต่อ
          if (typeof err === "object" && err && "digest" in err && /^NEXT_/.test(String(err.digest))) throw err;
          console.error(err);
          feedback.toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        }
      }}
    >
      {children}
    </form>
  );
}
