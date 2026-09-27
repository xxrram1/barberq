import { LoadingBar, PageHeaderSkeleton, Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="space-y-5">
      <LoadingBar />
      <PageHeaderSkeleton />
      <Skeleton className="h-20 rounded-2xl" />
      <div className="card divide-y divide-line">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
