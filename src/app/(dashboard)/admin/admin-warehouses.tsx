"use client";

import { useState, useEffect, useCallback } from "react";
import {
  adminListWarehouses,
  adminCreateWarehouse,
  adminUpdateWarehouse,
  adminDeleteWarehouse,
} from "@/app/actions/warehouse-actions";
import { useToast } from "@/components/ui/toaster";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Warehouse = { id: string; code: string; name: string; createdAt: Date };

export function AdminWarehouses() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { toast } = useToast();

  const fetchWarehouses = useCallback(async () => {
    const res = await adminListWarehouses();
    if (res.error) setError(res.error);
    else setWarehouses(res.warehouses as Warehouse[]);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchWarehouses().finally(() => setLoading(false));
  }, [fetchWarehouses]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await adminCreateWarehouse({ code: code.trim(), name: name.trim() });
    setCreating(false);
    if (res.error) {
      toast(res.error, { variant: "error" });
      return;
    }
    toast("Warehouse created", { variant: "success" });
    setCode("");
    setName("");
    fetchWarehouses();
  }

  function startEdit(w: Warehouse) {
    setEditingId(w.id);
    setEditCode(w.code);
    setEditName(w.name);
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    setSaving(true);
    const res = await adminUpdateWarehouse(editingId, {
      code: editCode.trim(),
      name: editName.trim(),
    });
    setSaving(false);
    if (res.error) {
      toast(res.error, { variant: "error" });
      return;
    }
    toast("Warehouse updated", { variant: "success" });
    setEditingId(null);
    fetchWarehouses();
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await adminDeleteWarehouse(deleteTarget.id);
    setDeleting(false);
    if (res.error) {
      toast(res.error, { variant: "error" });
      return;
    }
    toast(`Warehouse ${deleteTarget.name} deleted`, { variant: "success" });
    setDeleteTarget(null);
    fetchWarehouses();
  }

  const cardClass = "rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800/80";
  const inputClass = "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";
  const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400";
  const btnPrimary = "rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-60 dark:focus:ring-offset-zinc-800";
  const btnSecondary = "rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700";
  const btnDanger = "rounded-lg bg-red-100 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-900/50";

  return (
    <div className="space-y-6">
      <div className={`${cardClass} p-6`}>
        <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">Create warehouse</h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="w-40">
            <label className={labelClass}>Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. WH1"
              required
              className={inputClass}
            />
          </div>
          <div className="flex-1 min-w-0">
            <label className={labelClass}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Warehouse name"
              required
              className={inputClass}
            />
          </div>
          <button type="submit" disabled={creating} className={btnPrimary}>
            {creating ? "Creating…" : "Create warehouse"}
          </button>
        </form>
      </div>

      <div className={`overflow-hidden ${cardClass}`}>
        <div className="border-b border-zinc-200 px-5 py-3 dark:border-zinc-600">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Warehouses ({warehouses.length})</h2>
        </div>
        {error && (
          <div className="mx-5 mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}
        {loading ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
        ) : warehouses.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">No warehouses yet. Create one above.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/75 dark:border-zinc-600 dark:bg-zinc-700/50">
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Code</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Name</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-600">
              {warehouses.map((w) => (
                <tr key={w.id} className="transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-700/50">
                  <td className="px-5 py-3.5">
                    {editingId === w.id ? (
                      <input type="text" value={editCode} onChange={(e) => setEditCode(e.target.value)} className="max-w-[120px] rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100" />
                    ) : (
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{w.code}</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {editingId === w.id ? (
                      <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="max-w-xs rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100" />
                    ) : (
                      <span className="text-zinc-700 dark:text-zinc-300">{w.name}</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {editingId === w.id ? (
                      <div className="flex gap-2">
                        <button type="button" onClick={handleSaveEdit} disabled={saving} className={btnPrimary}>
                          Save
                        </button>
                        <button type="button" onClick={() => setEditingId(null)} className={btnSecondary}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => startEdit(w)} className={btnSecondary}>
                          Edit
                        </button>
                        <button type="button" onClick={() => setDeleteTarget({ id: w.id, name: w.name })} className={btnDanger}>
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete warehouse"
        description={
          deleteTarget
            ? `Delete warehouse "${deleteTarget.name}"? This may fail if it is referenced by teams or tasks.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        loading={deleting}
      />
    </div>
  );
}
