import { LoadingBar } from "@/components/skeleton";

/** loading ทั่วไป (เช่น หน้าแรก / ล็อกอิน): แถบวิ่ง + ไอคอนกรรไกรกลางจอ */
export default function Loading() {
  return (
    <>
      <LoadingBar />
      <div className="grid min-h-[60vh] place-items-center">
        <div className="flex flex-col items-center gap-3 text-muted">
          <span className="grid size-12 animate-bounce place-items-center rounded-xl bg-ink text-xl text-paper">✂</span>
          <span className="text-sm">กำลังโหลด...</span>
        </div>
      </div>
    </>
  );
}
