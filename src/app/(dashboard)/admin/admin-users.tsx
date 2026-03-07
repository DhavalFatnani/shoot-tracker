"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  adminCreateUser,
  adminListUsersWithDetails,
  adminUpdateUserRole,
  adminDeleteUser,
  type AdminUserWithDetails,
} from "@/app/actions/auth-actions";
import {
  adminListTeams,
  adminListWarehouses,
  adminGetUserTeams,
  adminSetUserTeams,
  type UserTeamRow,
} from "@/app/actions/team-actions";
import type { Role } from "@/lib/validations";
import { formatRelativeTime } from "@/lib/format-date";
import { useToast } from "@/components/ui/toaster";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const ROLES: { value: Role; label: string }[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "OPS_USER", label: "Operator" },
  { value: "SHOOT_USER", label: "Shoot User" },
];

const ROLE_BADGE_CLASS: Record<string, string> = {
  ADMIN: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200",
  OPS_USER: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  SHOOT_USER: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
};

const PAGE_SIZE = 10;

function displayName(u: AdminUserWithDetails): string {
  if (u.firstName && u.lastName) return `${u.firstName} ${u.lastName}`;
  if (u.firstName) return u.firstName;
  if (u.lastName) return u.lastName;
  return u.email.split("@")[0] || "—";
}

function initial(u: AdminUserWithDetails): string {
  const name = displayName(u);
  if (name === "—" || !name) return (u.email[0] ?? "?").toUpperCase();
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
  return name.slice(0, 2).toUpperCase();
}

function avatarColor(id: string): string {
  const hues = ["indigo", "emerald", "amber", "rose", "sky"];
  let n = 0;
  for (let i = 0; i < id.length; i++) n += id.charCodeAt(i);
  return hues[n % hues.length];
}

type TeamRow = { id: string; name: string; type: string; warehouseId: string | null; createdAt?: Date };
type WarehouseRow = { id: string; code: string; name: string };

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUserWithDetails[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("SHOOT_USER");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ userId: string; email: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [assignTarget, setAssignTarget] = useState<{ userId: string; email: string; role: string } | null>(null);
  const [assignUserTeams, setAssignUserTeams] = useState<UserTeamRow[]>([]);
  const [assignSelectedIds, setAssignSelectedIds] = useState<string[]>([]);
  const [assignEditingRole, setAssignEditingRole] = useState<Role>("SHOOT_USER");
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);

  const { toast } = useToast();
  const whMap = new Map(warehouses.map((w) => [w.id, w.name]));

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const result = await adminListUsersWithDetails();
    if (result.error) {
      setListError(result.error);
      setUsers([]);
    } else {
      setListError(null);
      setUsers(result.users);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    (async () => {
      const [tRes, wRes] = await Promise.all([
        import("@/app/actions/team-actions").then((m) => m.adminListTeams()),
        import("@/app/actions/team-actions").then((m) => m.adminListWarehouses()),
      ]);
      if (!tRes.error) setTeams((tRes.teams || []) as TeamRow[]);
      if (!wRes.error) setWarehouses((wRes.warehouses || []) as WarehouseRow[]);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        displayName(u).toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (ROLES.find((r) => r.value === u.role)?.label ?? u.role).toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage]
  );

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
    setAssignEditingRole((role as Role) || "SHOOT_USER");
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
    if (assignEditingRole !== assignTarget.role) {
      const roleRes = await adminUpdateUserRole({ userId: assignTarget.userId, role: assignEditingRole });
      if (roleRes.error) {
        toast(roleRes.error, { variant: "error" });
        setAssignSaving(false);
        return;
      }
    }
    const res = await adminSetUserTeams(assignTarget.userId, assignSelectedIds);
    setAssignSaving(false);
    if (res.error) {
      toast(res.error, { variant: "error" });
      return;
    }
    toast("User updated", { variant: "success" });
    closeAssignModal();
    fetchUsers();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    const result = await adminCreateUser({ email, password, role });
    setCreating(false);
    if (result.error) {
      setCreateError(result.error);
      return;
    }
    toast(`User ${email} created`, { variant: "success" });
    setAddModalOpen(false);
    setEmail("");
    setPassword("");
    setRole("SHOOT_USER");
    fetchUsers();
  }

  async function handleRoleChange(userId: string, newRole: Role) {
    const result = await adminUpdateUserRole({ userId, role: newRole });
    if (result.error) {
      toast(result.error, { variant: "error" });
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    toast("Role updated", { variant: "success" });
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

  function statusFromLastSignIn(lastSignInAt: string | null): "active" | "inactive" {
    if (!lastSignInAt) return "inactive";
    const d = new Date(lastSignInAt);
    const diffMins = (Date.now() - d.getTime()) / 60000;
    return diffMins <= 30 ? "active" : "inactive";
  }

  function exportCsv() {
    const headers = ["Name", "Email", "Role", "Teams", "Last active"];
    const rows = filtered.map((u) => [
      displayName(u),
      u.email,
      ROLES.find((r) => r.value === u.role)?.label ?? u.role,
      u.teamNames.join("; "),
      u.lastSignInAt ? formatRelativeTime(u.lastSignInAt) : "Never",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-6" aria-labelledby="user-management-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="user-management-heading" className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            User Management
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage permissions and team access for your warehouse personnel.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Add new user
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-center text-slate-400">
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="search"
            placeholder="Search by name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-12 pr-3 text-slate-900 placeholder-slate-400 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            title="Download CSV"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>
      </div>

      <div className="table-wrapper overflow-hidden">
        {listError && (
          <div className="mx-4 mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200" role="alert">
            {listError}
          </div>
        )}
        {loading ? (
          <div className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">Loading users…</div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">No users found.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table table-sticky table-row-hover w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="table-th">User details</th>
                    <th className="table-th">Role</th>
                    <th className="table-th">Team</th>
                    <th className="table-th">Last active</th>
                    <th className="table-th w-20">Status</th>
                    <th className="table-th w-24 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((u) => {
                    const status = statusFromLastSignIn(u.lastSignInAt);
                    const color = avatarColor(u.id);
                    return (
                      <tr key={u.id}>
                        <td className="table-td">
                          <div className="flex items-center gap-3">
                            <span
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                              style={{
                                backgroundColor: color === "indigo" ? "#6366f1" : color === "emerald" ? "#10b981" : color === "amber" ? "#f59e0b" : color === "rose" ? "#f43f5e" : "#0ea5e9",
                              }}
                            >
                              {initial(u)}
                            </span>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900 dark:text-slate-100">{displayName(u)}</p>
                              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="table-td">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_BADGE_CLASS[u.role] ?? "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200"}`}>
                            {ROLES.find((r) => r.value === u.role)?.label ?? u.role}
                          </span>
                        </td>
                        <td className="table-td text-slate-600 dark:text-slate-300">
                          {u.teamNames.length > 0 ? u.teamNames.join(", ") : "—"}
                        </td>
                        <td className="table-td text-slate-500 dark:text-slate-400">
                          {u.lastSignInAt ? formatRelativeTime(u.lastSignInAt) : "Never"}
                        </td>
                        <td className="table-td">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            title={status === "active" ? "Active" : "Inactive"}
                            style={{
                              backgroundColor: status === "active" ? "#22c55e" : "#94a3b8",
                            }}
                            aria-hidden
                          />
                        </td>
                        <td className="table-td text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openAssignModal(u.id, u.email, u.role)}
                              className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                              title="Edit / Assign teams"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => openDeleteDialog(u.id, u.email)}
                              className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                              title="Delete"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 sm:flex-row dark:border-slate-800">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} users
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                      n === currentPage
                        ? "bg-indigo-600 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  ›
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add user modal */}
      {addModalOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/50" aria-hidden onClick={() => setAddModalOpen(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add new user</h3>
            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div className="form-group">
                <label htmlFor="new-email" className="label">Email</label>
                <input id="new-email" type="email" placeholder="user@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="input" />
              </div>
              <div className="form-group">
                <label htmlFor="new-password" className="label">Password</label>
                <input id="new-password" type="text" placeholder="Temporary password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="input" />
              </div>
              <div className="form-group">
                <label htmlFor="new-role" className="label">Role</label>
                <select id="new-role" value={role} onChange={(e) => setRole(e.target.value as Role)} className="input">
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              {createError && <p className="text-sm text-red-600 dark:text-red-400">{createError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setAddModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={creating} className="btn btn-primary">{creating ? "Creating…" : "Create user"}</button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Assign teams modal */}
      {assignTarget && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/50" aria-hidden onClick={closeAssignModal} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {assignTarget.role === "OPS_USER" ? "Assign warehouses (Ops teams)" : assignTarget.role === "SHOOT_USER" ? "Assign shoot teams" : "Assign teams"}
              </h3>
              <button type="button" onClick={closeAssignModal} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">{assignTarget.email}</p>
            <div className="mb-4 form-group">
              <label className="label">Role</label>
              <select value={assignEditingRole} onChange={(e) => setAssignEditingRole(e.target.value as Role)} className="input w-full max-w-xs">
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Teams</p>
            {assignLoading ? (
              <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Loading…</p>
            ) : (
              <>
                <ul className="mb-4 max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-600">
                  {(assignTarget.role === "OPS_USER" ? teams.filter((t) => t.type === "OPS") : assignTarget.role === "SHOOT_USER" ? teams.filter((t) => t.type === "SHOOT") : teams).map((t) => (
                    <li key={t.id} className="flex items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-0 dark:border-slate-700">
                      <input type="checkbox" id={`assign-${t.id}`} checked={assignSelectedIds.includes(t.id)} onChange={() => toggleAssignTeam(t.id)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800" />
                      <label htmlFor={`assign-${t.id}`} className="flex-1 cursor-pointer text-sm text-slate-900 dark:text-slate-100">
                        {t.name}
                        {t.type === "OPS" && t.warehouseId && <span className="ml-1.5 text-slate-500 dark:text-slate-400">(Warehouse: {whMap.get(t.warehouseId) ?? t.warehouseId})</span>}
                      </label>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={closeAssignModal} className="btn btn-secondary">Cancel</button>
                  <button type="button" onClick={handleSaveAssign} disabled={assignSaving || assignLoading} className="btn btn-primary">{assignSaving ? "Saving…" : "Save"}</button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete user"
        description={deleteTarget ? `Delete user ${deleteTarget.email}? This cannot be undone.` : ""}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        loading={deleting}
      />
    </section>
  );
}
