import { AdminWarehouses } from "../admin-warehouses";

export default function AdminWarehousesPage() {
  return (
    <section className="space-y-6" aria-labelledby="admin-warehouses-heading">
      <h2 id="admin-warehouses-heading" className="sr-only">Warehouses</h2>
      <AdminWarehouses />
    </section>
  );
}
