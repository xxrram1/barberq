import { LoadingBar, PageHeaderSkeleton, Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <LoadingBar />
      <PageHeaderSkeleton />
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-8">
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-28 rounded-full" />
            ))}
          </div>
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 10 }, (_, i) => (
              <Skeleton key={i} className="h-20 w-16 shrink-0 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {Array.from({ length: 12 }, (_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );
}
