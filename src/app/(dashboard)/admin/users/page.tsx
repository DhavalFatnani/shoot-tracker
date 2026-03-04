import { AdminUsers } from "../admin-users";

export default function AdminUsersPage() {
  return (
    <section className="space-y-6" aria-labelledby="admin-users-heading">
      <h2 id="admin-users-heading" className="sr-only">Users</h2>
      <AdminUsers />
    </section>
  );
}
