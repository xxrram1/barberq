/** กล่องสีเทากะพริบ ใช้แทนเนื้อหาระหว่างโหลด */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-stone-200/80 ${className}`} />;
}

/** แถบสีทองวิ่งด้านบนสุดระหว่างเปลี่ยนหน้า (สีต่างจากแถบลายของ navbar จะได้สังเกตเห็น) */
export function LoadingBar() {
  return (
    <div role="status" aria-label="กำลังโหลด" className="fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-brass/20">
      <div className="loading-bar h-full w-1/3 rounded-full bg-brass shadow-[0_0_8px_var(--color-brass)]" />
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
