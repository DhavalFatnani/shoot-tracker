import { AdminTeams } from "../admin-teams";

export default function AdminTeamsPage() {
  return (
    <section className="space-y-6" aria-labelledby="admin-teams-heading">
      <h2 id="admin-teams-heading" className="sr-only">Teams</h2>
      <AdminTeams />
    </section>
  );
}
