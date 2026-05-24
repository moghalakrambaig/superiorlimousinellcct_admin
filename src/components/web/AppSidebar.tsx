import { Link, useRouterState } from "@tanstack/react-router";
import { Crown, LayoutDashboard, Users, CalendarDays, CarFront } from "lucide-react";
import { cn } from "@/lib/utils";


const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Bookings", url: "/bookings", icon: CarFront },
  { title: "Calendar", url: "/calendar", icon: CalendarDays },
] as const;

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (url: string) => path === url || path.startsWith(url + "/");

  return (
    <aside className="w-64 shrink-0 hidden md:flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="px-6 py-6 flex items-center gap-3 border-b border-sidebar-border">
        <div className="h-9 w-9 rounded-md gradient-gold grid place-items-center">
          <Crown className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <div className="font-display text-base leading-tight">Superior Limousine LLC</div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-gold mt-1">Executive Transportation</div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {items.map((it) => {
          const active = isActive(it.url);
          return (
            <Link
              key={it.url}
              to={it.url}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all",
                active
                  ? "bg-gold-soft text-gold border border-gold/30"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <it.icon className="h-4 w-4" />
              <span>{it.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border text-[10px] uppercase tracking-[0.25em] text-sidebar-foreground/50">
        Admin Console · v1.0
      </div>
    </aside>
  );
}

export function MobileTopBar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="md:hidden bg-sidebar border-b border-sidebar-border">
      <div className="px-4 py-3 flex items-center gap-3">
        <Crown className="h-5 w-5 text-gold" />
        <span className="font-display">Superior Limousine LLC</span>
      </div>
      <div className="flex overflow-x-auto px-2 pb-2 gap-1">
        {items.map((it) => {
          const active = path === it.url || path.startsWith(it.url + "/");
          return (
            <Link
              key={it.url}
              to={it.url}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs whitespace-nowrap",
                active ? "bg-gold-soft text-gold" : "text-sidebar-foreground/70",
              )}
            >
              <it.icon className="h-3.5 w-3.5" />
              {it.title}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
