"use client";

import { useState, useEffect, useCallback } from "react";
import {
  adminCreateUser,
  adminListUsers,
  adminUpdateUserRole,
  adminDeleteUser,
} from "@/app/actions/auth-actions";
import {
  adminListTeams,
  adminListWarehouses,
  adminGetUserTeams,
  adminSetUserTeams,
  type UserTeamRow,
} from "@/app/actions/team-actions";
import type { Role } from "@/lib/validations";
import { formatDateIST } from "@/lib/format-date";
import { useToast } from "@/components/ui/toaster";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const ROLES: { value: Role; label: string }[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "OPS_USER", label: "Ops User" },
  { value: "SHOOT_USER", label: "Shoot User" },
];

type UserRow = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
};

type TeamRow = { id: string; name: string; type: string; warehouseId: string | null; createdAt?: Date };
type WarehouseRow = { id: string; code: string; name: string };

export function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("SHOOT_USER");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ userId: string; email: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [assignTarget, setAssignTarget] = useState<{ userId: string; email: string; role: string } | null>(null);
  const [assignUserTeams, setAssignUserTeams] = useState<UserTeamRow[]>([]);
  const [assignSelectedIds, setAssignSelectedIds] = useState<string[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);

  const { toast } = useToast();
  const whMap = new Map(warehouses.map((w) => [w.id, w.name]));

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const result = await adminListUsers();
    if (result.error) {
      setListError(result.error);
    } else {
      setUsers(result.users);
      setListError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    (async () => {
      const [tRes, wRes] = await Promise.all([adminListTeams(), adminListWarehouses()]);
      if (!tRes.error) setTeams((tRes.teams || []) as TeamRow[]);
      if (!wRes.error) setWarehouses((wRes.warehouses || []) as WarehouseRow[]);
    })();
  }, []);

  async function openAssignModal(userId: string, email: string, role: string) {
    setAssignTarget({ userId, email, role });
    setAssignLoading(true);
    const res = await adminGetUserTeams(userId);
    setAssignLoading(false);
    if (res.error) {
      toast(res.error, { variant: "error" });
      return;
    }
    setAssignUserTeams(res.teams);
    setAssignSelectedIds(res.teams.map((t) => t.id));
  }

  function closeAssignModal() {
    setAssignTarget(null);
  }

  function toggleAssignTeam(teamId: string) {
    setAssignSelectedIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  }

  async function handleSaveAssign() {
    if (!assignTarget) return;
    setAssignSaving(true);
    const res = await adminSetUserTeams(assignTarget.userId, assignSelectedIds);
    setAssignSaving(false);
    if (res.error) {
      toast(res.error, { variant: "error" });
      return;
    }
    toast("Assignments updated", { variant: "success" });
    closeAssignModal();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);
    setCreating(true);
    const result = await adminCreateUser({ email, password, role });
    setCreating(false);
    if (result.error) {
      setCreateError(result.error);
      return;
    }
    setCreateSuccess(`User ${email} created as ${role}.`);
    toast(`User ${email} created as ${role}`, { variant: "success" });
    setEmail("");
    setPassword("");
    setRole("SHOOT_USER");
    fetchUsers();
  }

  async function handleRoleChange(userId: string, newRole: Role) {
    const result = await adminUpdateUserRole({ userId, role: newRole });
    if (result.error) {
      setListError(result.error);
      return;
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
  }

  function openDeleteDialog(userId: string, email: string) {
    setDeleteTarget({ userId, email });
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await adminDeleteUser({ userId: deleteTarget.userId });
    setDeleting(false);
    if (result.error) {
      toast(result.error, { variant: "error" });
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.userId));
    toast(`User ${deleteTarget.email} deleted`, { variant: "success" });
    setDeleteTarget(null);
  }

  const cardClass = "rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800/80";
  const inputClass = "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400";
  const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400";
  const btnPrimary = "rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-60 dark:focus:ring-offset-zinc-800";

  return (
    <div className="space-y-6">
      {/* Create user */}
      <div className={`${cardClass} p-6`}>
        <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Create user
        </h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 min-w-0">
            <label htmlFor="new-email" className={labelClass}>Email</label>
            <input
              id="new-email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div className="flex-1 min-w-0">
            <label htmlFor="new-password" className={labelClass}>Password</label>
            <input
              id="new-password"
              type="text"
              placeholder="Temporary password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className={inputClass}
            />
          </div>
          <div className="w-36">
            <label htmlFor="new-role" className={labelClass}>Role</label>
            <select
              id="new-role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className={inputClass}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={creating} className={btnPrimary}>
            {creating ? "Creating…" : "Create user"}
          </button>
        </form>
        {createError && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200" role="alert">
            {createError}
          </div>
        )}
        {createSuccess && (
          <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200">
            {createSuccess}
          </div>
        )}
      </div>

      {/* User list */}
      <div className={`overflow-hidden ${cardClass}`}>
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-600">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Users ({users.length})</h2>
        </div>
        {listError && (
          <div className="mx-5 mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">
            {listError}
          </div>
        )}
        {loading ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">Loading users…</p>
        ) : users.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">No users found.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/75 dark:border-zinc-600 dark:bg-zinc-700/50">
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Email</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Role</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Assign</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Created</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-600">
              {users.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-700/50">
                  <td className="px-5 py-3.5 font-medium text-zinc-900 dark:text-zinc-100">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                      className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      type="button"
                      onClick={() => openAssignModal(u.id, u.email, u.role)}
                      className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                    >
                      {u.role === "OPS_USER" ? "Warehouses" : u.role === "SHOOT_USER" ? "Shoot teams" : "Teams"}
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400">
                    {formatDateIST(u.createdAt)}
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      type="button"
                      onClick={() => openDeleteDialog(u.id, u.email)}
                      className="rounded-lg bg-red-100 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 transition dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-900/50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {assignTarget && (
        <>
          <div className="fixed inset-0 z-40 bg-zinc-900/50" aria-hidden onClick={closeAssignModal} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {assignTarget.role === "OPS_USER"
                  ? "Assign warehouses (Ops teams)"
                  : assignTarget.role === "SHOOT_USER"
                    ? "Assign shoot teams"
                    : "Assign teams"}
              </h3>
              <button
                type="button"
                onClick={closeAssignModal}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
              {assignTarget.email} — select which teams give access to tasks.
            </p>
            {assignLoading ? (
              <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
            ) : (
              <>
              <ul className="mb-4 max-h-64 space-y-2 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-600">
                {(assignTarget.role === "OPS_USER"
                  ? teams.filter((t) => t.type === "OPS")
                  : assignTarget.role === "SHOOT_USER"
                    ? teams.filter((t) => t.type === "SHOOT")
                    : teams
                ).map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-3 border-b border-zinc-100 px-3 py-2.5 last:border-0 dark:border-zinc-700"
                  >
                    <input
                      type="checkbox"
                      id={`assign-${t.id}`}
                      checked={assignSelectedIds.includes(t.id)}
                      onChange={() => toggleAssignTeam(t.id)}
                      className="h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500 dark:border-zinc-600 dark:bg-zinc-800"
                    />
                    <label htmlFor={`assign-${t.id}`} className="flex-1 cursor-pointer text-sm text-zinc-900 dark:text-zinc-100">
                      {t.name}
                      {t.type === "OPS" && t.warehouseId && (
                        <span className="ml-1.5 text-zinc-500 dark:text-zinc-400">
                          (Warehouse: {whMap.get(t.warehouseId) ?? t.warehouseId})
                        </span>
                      )}
                    </label>
                  </li>
                ))}
              </ul>
              {(assignTarget.role === "OPS_USER"
                ? teams.filter((t) => t.type === "OPS")
                : assignTarget.role === "SHOOT_USER"
                  ? teams.filter((t) => t.type === "SHOOT")
                  : teams
              ).length === 0 && (
                <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
                  No {assignTarget.role === "OPS_USER" ? "Ops" : assignTarget.role === "SHOOT_USER" ? "Shoot" : ""} teams yet. Create them in Admin → Teams first.
                </p>
              )}
              </>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeAssignModal}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAssign}
                disabled={assignSaving || assignLoading}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-60 dark:focus:ring-offset-zinc-800"
              >
                {assignSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete user"
        description={
          deleteTarget
            ? `Delete user ${deleteTarget.email}? This cannot be undone.`
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
