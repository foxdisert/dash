import { requireSession } from "@/lib/auth/guard";
import { Nav } from "@/components/Nav";
import { ToastProvider } from "@/components/Toast";
import { getExpiringNotifications, getNewOrderCount } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const notifications = getExpiringNotifications(7);
  const newOrders = session.role === "admin" ? getNewOrderCount() : 0;

  return (
    <ToastProvider>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 md:flex-row md:p-6">
        <Nav
          username={session.username}
          role={session.role}
          notifications={notifications}
          newOrders={newOrders}
        />
        <main className="min-w-0 flex-1 pb-10">{children}</main>
      </div>
    </ToastProvider>
  );
}
