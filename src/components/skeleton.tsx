/** กล่องสีเทากะพริบ ใช้แทนเนื้อหาระหว่างโหลด */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-stone-200/80 ${className}`} />;
}

/** แถบลายเสาร้านตัดผมวิ่ง แสดงด้านบนสุดระหว่างเปลี่ยนหน้า */
export function LoadingBar() {
  return (
    <div role="status" aria-label="กำลังโหลด" className="fixed inset-x-0 top-0 z-50 h-1 overflow-hidden">
      <div className="barber-stripe loading-bar h-full w-[200%]" />
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
    </div>
  );
}

export function CardListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="card flex items-center gap-4 p-5">
          <Skeleton className="size-14 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}
