import { Skeleton } from "@/components/ui/skeleton";

export default function DisputesLoading() {
  return (
    <div className="page-container space-y-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-20 rounded-lg" />
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-24 rounded-lg" />
      </div>
      <div>
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="mt-1 h-4 w-80 rounded-lg" />
      </div>
      <div className="table-wrapper">
        <div className="border-b border-slate-200 px-5 py-3.5 dark:border-slate-700">
          <div className="flex gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="ml-auto h-8 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
