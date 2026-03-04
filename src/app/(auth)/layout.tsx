export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(15,23,42,0.08),transparent)]" />
      <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
        {children}
      </main>
    </div>
  );
}
