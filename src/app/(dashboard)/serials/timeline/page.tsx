import { getSession } from "@/lib/auth/get-session";
import { SerialTimelineForm } from "./serial-timeline-form";

export default async function SerialTimelinePage() {
  const session = await getSession();
  if (!session) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Serial timeline</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Enter a serial ID to view its full event history and audit trail.
        </p>
      </div>
      <SerialTimelineForm />
    </div>
  );
}
