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

  return (
    <div className="space-y-6">
      <div className="section-card p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">Create warehouse</h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="w-40">
            <label className="label">Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. WH1"
              required
              className="input"
            />
          </div>
          <div className="flex-1 min-w-0">
            <label className="label">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Warehouse name"
              required
              className="input"
            />
          </div>
          <button type="submit" disabled={creating} className="btn btn-primary">
            {creating ? "Creating…" : "Create warehouse"}
          </button>
        </form>
      </div>

      <div className="section-card overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-600">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Warehouses ({warehouses.length})</h2>
        </div>
        {error && (
          <div className="mx-5 mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}
        {loading ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">Loading…</p>
        ) : warehouses.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No warehouses yet. Create one above.</p>
        ) : (
          <div className="table-wrapper">
            <table className="table table-sticky table-row-hover w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="table-th">Code</th>
                  <th className="table-th">Name</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody>
              {warehouses.map((w) => (
                <tr key={w.id}>
                  <td className="table-td">
                    {editingId === w.id ? (
                      <input type="text" value={editCode} onChange={(e) => setEditCode(e.target.value)} className="max-w-[120px] rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
                    ) : (
                      <span className="font-medium text-slate-900 dark:text-slate-100">{w.code}</span>
                    )}
                  </td>
                  <td className="table-td">
                    {editingId === w.id ? (
                      <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="max-w-xs rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
                    ) : (
                      <span className="text-slate-700 dark:text-slate-300">{w.name}</span>
                    )}
                  </td>
                  <td className="table-td">
                    {editingId === w.id ? (
                      <div className="flex gap-2">
                        <button type="button" onClick={handleSaveEdit} disabled={saving} className="btn btn-primary">
                          Save
                        </button>
                        <button type="button" onClick={() => setEditingId(null)} className="btn btn-secondary text-xs">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => startEdit(w)} className="btn btn-secondary text-xs">
                          Edit
                        </button>
                        <button type="button" onClick={() => setDeleteTarget({ id: w.id, name: w.name })} className="btn btn-danger text-xs">
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
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
