import { CardListSkeleton, LoadingBar, PageHeaderSkeleton, Skeleton } from "@/components/skeleton";

/** ใช้กับทุกหน้าในหลังร้านที่ไม่มี loading ของตัวเอง (layout + เมนูแอดมินแสดงค้างไว้ได้เลย) */
export default function Loading() {
  return (
    <div className="space-y-6">
      <LoadingBar />
      <PageHeaderSkeleton />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <CardListSkeleton rows={3} />
    </div>
  );
}
