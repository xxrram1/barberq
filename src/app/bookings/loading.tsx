import { CardListSkeleton, LoadingBar, PageHeaderSkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <LoadingBar />
      <PageHeaderSkeleton />
      <div className="mt-10">
        <CardListSkeleton rows={3} />
      </div>
    </div>
  );
}
