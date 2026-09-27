import { LoadingBar, Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <LoadingBar />
      <Skeleton className="h-4 w-24" />
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
        <div className="card space-y-5 p-6">
          <Skeleton className="h-8 w-56" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        </div>
        <div className="card space-y-4 p-6">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="mx-auto size-48" />
          <Skeleton className="h-10" />
        </div>
      </div>
    </div>
  );
}
