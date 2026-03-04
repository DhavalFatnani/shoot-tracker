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
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Buffer aging</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Serials in SHOOT_BUFFER sorted by days in buffer. Filter, bulk return, or escalate.
        </p>
      </div>
      <BufferAgingTable initialItems={data.items} />
    </div>
  );
}
