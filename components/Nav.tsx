"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/auth/actions";
import { NotificationBell } from "@/components/NotificationBell";
import type { ExpiringNotification } from "@/lib/queries";

const LINKS = [
  { href: "/", label: "Overview", icon: "📊", adminOnly: true },
  { href: "/clients", label: "Clients", icon: "👥", adminOnly: false },
  { href: "/orders", label: "Orders", icon: "🛒", adminOnly: true },
  { href: "/clients/new", label: "New line", icon: "➕", adminOnly: true },
  { href: "/bouquets", label: "Bouquets", icon: "📦", adminOnly: true },
  { href: "/messages", label: "Messages", icon: "💬", adminOnly: true },
  { href: "/providers", label: "Providers", icon: "🔌", adminOnly: true },
  { href: "/users", label: "Team", icon: "🧑‍🤝‍🧑", adminOnly: true },
  { href: "/settings", label: "Settings", icon: "⚙️", adminOnly: true },
];

export function Nav({
  username,
  role,
  notifications,
  newOrders = 0,
}: {
  username: string;
  role: "admin" | "agent";
  notifications: ExpiringNotification[];
  newOrders?: number;
}) {
  const pathname = usePathname();
  const isAdmin = role === "admin";
  const links = LINKS.filter((l) => isAdmin || !l.adminOnly);

  return (
    <aside className="flex w-full flex-col gap-3 md:h-screen md:w-64 md:shrink-0">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={isAdmin ? "/" : "/clients"}
          className="inline-block rotate-[-2deg] self-start rounded-lg border-[3px] border-ink bg-yellow px-3 py-1 text-xl font-bold shadow-[3px_3px_0_0_#131313]"
        >
          📺 MorsarDash
        </Link>
        <NotificationBell items={notifications} canRenew={isAdmin} />
      </div>

      <nav className="flex flex-wrap gap-2 md:flex-col">
        {links.map((l) => {
          const active =
            l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`nb-btn ${active ? "bg-pink" : "bg-white"} justify-start`}
            >
              <span>{l.icon}</span>
              <span>{l.label}</span>
              {l.href === "/orders" && newOrders > 0 && (
                <span className="ml-auto flex size-5 items-center justify-center rounded-full border-2 border-ink bg-red text-xs font-bold text-white">
                  {newOrders > 9 ? "9+" : newOrders}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden md:block">
        <div className="nb-card bg-cyan text-white">
          <p className="text-xs font-bold opacity-80">Signed in as</p>
          <p className="font-bold">{username}</p>
          <form action={logoutAction} className="mt-2">
            <button className="nb-btn w-full bg-white text-ink">Log out</button>
          </form>
        </div>
      </div>
    </aside>
  );
}
