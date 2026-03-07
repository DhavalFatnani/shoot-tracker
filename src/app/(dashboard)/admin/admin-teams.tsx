"use client";

import { useState, useEffect, useCallback } from "react";
import {
  adminListTeams,
  adminListWarehouses,
  adminCreateTeam,
  adminUpdateTeam,
  adminDeleteTeam,
  adminListTeamMembers,
  adminAddTeamMember,
  adminRemoveTeamMember,
  type TeamType,
} from "@/app/actions/team-actions";
import { adminListUsers } from "@/app/actions/auth-actions";
import { useToast } from "@/components/ui/toaster";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Team = { id: string; name: string; type: string; warehouseId: string | null; createdAt: Date };
type Warehouse = { id: string; code: string; name: string };
type UserRow = { id: string; email: string; role: string };

const TEAM_TYPES: { value: TeamType; label: string }[] = [
  { value: "SHOOT", label: "Shoot" },
  { value: "OPS", label: "Ops" },
];

export function AdminTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<TeamType>("SHOOT");
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<TeamType>("SHOOT");
  const [editWarehouseId, setEditWarehouseId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [memberTeamId, setMemberTeamId] = useState<string | null>(null);
  const [memberUserIds, setMemberUserIds] = useState<string[]>([]);
  const [addUserId, setAddUserId] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  const { toast } = useToast();

  const fetchTeams = useCallback(async () => {
    const res = await adminListTeams();
    if (res.error) setError(res.error);
    else setTeams(res.teams as Team[]);
  }, []);

  const fetchWarehouses = useCallback(async () => {
    const res = await adminListWarehouses();
    if (res.error) return;
    setWarehouses(res.warehouses as Warehouse[]);
  }, []);

  const fetchUsers = useCallback(async () => {
    const res = await adminListUsers();
    if (res.error) return;
    setUsers(res.users);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchTeams(), fetchWarehouses(), fetchUsers()]).finally(() =>
      setLoading(false)
    );
  }, [fetchTeams, fetchWarehouses, fetchUsers]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await adminCreateTeam({
      name: name.trim(),
      type,
      warehouseId: warehouseId || null,
    });
    setCreating(false);
    if (res.error) {
      toast(res.error, { variant: "error" });
      return;
    }
    toast("Team created", { variant: "success" });
    setName("");
    setType("SHOOT");
    setWarehouseId("");
    fetchTeams();
  }

  function startEdit(t: Team) {
    setEditingId(t.id);
    setEditName(t.name);
    setEditType(t.type as TeamType);
    setEditWarehouseId(t.warehouseId ?? "");
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    setSaving(true);
    const res = await adminUpdateTeam(editingId, {
      name: editName.trim(),
      type: editType,
      warehouseId: editWarehouseId || null,
    });
    setSaving(false);
    if (res.error) {
      toast(res.error, { variant: "error" });
      return;
    }
    toast("Team updated", { variant: "success" });
    setEditingId(null);
    fetchTeams();
  }

  async function openMembers(teamId: string) {
    setMemberTeamId(teamId);
    const res = await adminListTeamMembers(teamId);
    if (res.error) {
      toast(res.error, { variant: "error" });
      return;
    }
    setMemberUserIds(res.userIds);
    setAddUserId("");
  }

  async function handleAddMember() {
    if (!memberTeamId || !addUserId) return;
    setAddingMember(true);
    const res = await adminAddTeamMember(memberTeamId, addUserId);
    setAddingMember(false);
    if (res.error) {
      toast(res.error, { variant: "error" });
      return;
    }
    toast("Member added", { variant: "success" });
    setMemberUserIds((prev) => [...prev, addUserId]);
    setAddUserId("");
  }

  async function handleRemoveMember(userId: string) {
    if (!memberTeamId) return;
    const res = await adminRemoveTeamMember(memberTeamId, userId);
    if (res.error) {
      toast(res.error, { variant: "error" });
      return;
    }
    toast("Member removed", { variant: "success" });
    setMemberUserIds((prev) => prev.filter((id) => id !== userId));
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await adminDeleteTeam(deleteTarget.id);
    setDeleting(false);
    if (res.error) {
      toast(res.error, { variant: "error" });
      return;
    }
    toast(`Team ${deleteTarget.name} deleted`, { variant: "success" });
    setDeleteTarget(null);
    fetchTeams();
  }

  const warehouseName = (id: string | null) =>
    id ? warehouses.find((w) => w.id === id)?.name ?? "—" : "—";
  const userEmail = (id: string) => users.find((u) => u.id === id)?.email ?? "—";
  const availableToAdd = users.filter((u) => !memberUserIds.includes(u.id));

  return (
    <div className="space-y-6">
      <div className="section-card p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">Create team</h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="form-group flex-1 min-w-0">
            <label className="label">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Team name"
              required
              className="input"
            />
          </div>
          <div className="form-group w-32">
            <label className="label">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as TeamType)} className="input">
              {TEAM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group w-48">
            <label className="label">Warehouse (optional)</label>
            <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="input">
              <option value="">—</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={creating} className="btn btn-primary">
            {creating ? "Creating…" : "Create team"}
          </button>
        </form>
      </div>

      <div className="section-card overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-600">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Teams ({teams.length})</h2>
        </div>
        {error && (
          <div className="mx-5 mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}
        {loading ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">Loading…</p>
        ) : teams.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No teams yet. Create one above.</p>
        ) : (
          <div className="table-wrapper">
            <table className="table table-sticky table-row-hover w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="table-th">Name</th>
                  <th className="table-th">Type</th>
                  <th className="table-th">Warehouse</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody>
              {teams.map((t) => (
                <tr key={t.id}>
                  <td className="table-td">
                    {editingId === t.id ? (
                      <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="max-w-xs rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
                    ) : (
                      <span className="font-medium text-slate-900 dark:text-slate-100">{t.name}</span>
                    )}
                  </td>
                  <td className="table-td">
                    {editingId === t.id ? (
                      <select value={editType} onChange={(e) => setEditType(e.target.value as TeamType)} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
                        {TEAM_TYPES.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-slate-700 dark:text-slate-300">{t.type}</span>
                    )}
                  </td>
                  <td className="table-td">
                    {editingId === t.id ? (
                      <select value={editWarehouseId} onChange={(e) => setEditWarehouseId(e.target.value)} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
                        <option value="">—</option>
                        {warehouses.map((w) => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400">{warehouseName(t.warehouseId)}</span>
                    )}
                  </td>
                  <td className="table-td">
                    {editingId === t.id ? (
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
                        <button type="button" onClick={() => openMembers(t.id)} className="btn btn-secondary text-xs">
                          Members
                        </button>
                        <button type="button" onClick={() => startEdit(t)} className="btn btn-secondary text-xs">
                          Edit
                        </button>
                        <button type="button" onClick={() => setDeleteTarget({ id: t.id, name: t.name })} className="btn btn-danger text-xs">
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

      {memberTeamId && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/50" aria-hidden onClick={() => setMemberTeamId(null)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Team members</h3>
              <button
                type="button"
                onClick={() => setMemberTeamId(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ul className="mb-4 max-h-48 space-y-2 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-600">
              {memberUserIds.length === 0 ? (
                <li className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400">No members yet.</li>
              ) : (
                memberUserIds.map((userId) => (
                  <li key={userId} className="flex items-center justify-between border-b border-slate-100 px-3 py-2 last:border-0 dark:border-slate-700">
                    <span className="text-sm text-slate-900 dark:text-slate-100">{userEmail(userId)}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(userId)}
                      className="rounded-lg bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-900/50"
                    >
                      Remove
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className="flex gap-2">
              <select
                value={addUserId}
                onChange={(e) => setAddUserId(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">Add user…</option>
                {availableToAdd.map((u) => (
                  <option key={u.id} value={u.id}>{u.email}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddMember}
                disabled={!addUserId || addingMember}
                className="btn btn-primary"
              >
                Add
              </button>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete team"
        description={
          deleteTarget
            ? `Delete team "${deleteTarget.name}"? This will remove all member assignments. Tasks linked to this team may be affected.`
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
