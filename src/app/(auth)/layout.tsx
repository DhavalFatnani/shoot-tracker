export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#1A1A2E]">
      <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
        {children}
      </main>
    </div>
  );
}
