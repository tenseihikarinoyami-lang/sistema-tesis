import { Footer } from "@/components/ui/footer";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-grow flex items-center justify-center p-4">
        {children}
      </main>
      <Footer />
    </div>
  );
}
