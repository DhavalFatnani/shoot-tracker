import { getSession } from "@/lib/auth/get-session";
import { getBufferAgingList } from "@/app/actions/buffer-actions";
import { BufferAgingTable } from "./buffer-aging-table";

export default async function BufferAgingPage() {
  const session = await getSession();
  if (!session) return null;

  const formData = new FormData();
  formData.set("limit", "50");
  const result = await getBufferAgingList(formData);
  const data = result.success && result.data ? result.data : { items: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Buffer aging</h1>
        <p className="page-subtitle mt-1">
          Serials in SHOOT_BUFFER sorted by days in buffer. Filter, bulk return, or escalate.
        </p>
      </div>
      <BufferAgingTable initialItems={data.items} />
    </div>
  );
}
