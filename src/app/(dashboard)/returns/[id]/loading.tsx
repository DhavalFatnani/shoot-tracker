import { Skeleton } from "@/components/ui/skeleton";

export default function ReturnDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-56" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="mt-1 h-4 w-48 font-mono" />
          <Skeleton className="mt-1 h-4 w-40" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2 h-8 w-12" />
            <Skeleton className="mt-1 h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-600">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-1 h-3 w-72" />
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-600">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-0.5 h-3 w-20 font-mono" />
              </div>
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
      <Skeleton className="h-4 w-28" />
    </div>
  );
}
