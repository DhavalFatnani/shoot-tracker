import { getSession } from "@/lib/auth/get-session";
import { SerialTimelineForm } from "./serial-timeline-form";
import { Breadcrumbs } from "@/components/breadcrumbs";

export default async function SerialTimelinePage() {
  const session = await getSession();
  if (!session) return null;
  const canRaiseDispute = session.role === "OPS_USER" || session.role === "ADMIN";

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ href: "/dashboard", label: "Dashboard" }, { label: "Serials Timeline" }]} />
      <div>
        <h1 className="page-title">Serials Timeline</h1>
        <p className="page-subtitle mt-1">
          Audit lifecycle and trace event history for specific serialized items.
        </p>
      </div>
      <SerialTimelineForm canRaiseDispute={canRaiseDispute} />
    </div>
  );
}
