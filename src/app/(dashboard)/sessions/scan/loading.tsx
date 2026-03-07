import { Skeleton } from "@/components/ui/skeleton";

export default function ScanSessionLoading() {
  return (
    <div className="page-container space-y-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-20 rounded-lg" />
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-24 rounded-lg" />
      </div>
      <div>
        <Skeleton className="h-8 w-40 rounded-lg" />
        <Skeleton className="mt-1 h-4 w-64 rounded-lg" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
