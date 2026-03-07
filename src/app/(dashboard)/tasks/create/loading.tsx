import { Skeleton } from "@/components/ui/skeleton";

export default function CreateTaskLoading() {
  return (
    <div className="page-container space-y-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-16 rounded-lg" />
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-28 rounded-lg" />
      </div>
      <div>
        <Skeleton className="h-8 w-40 rounded-lg" />
        <Skeleton className="mt-1 h-4 w-full max-w-2xl rounded-lg" />
      </div>
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}
