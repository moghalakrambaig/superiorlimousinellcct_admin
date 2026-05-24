import { Link, useLocation } from "@tanstack/react-router";
import { Home, Calendar, Users, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Dashboard", href: "/mobile/dashboard" },
  { icon: Briefcase, label: "Bookings", href: "/mobile/bookings" },
  { icon: Calendar, label: "Calendar", href: "/mobile/calendar" },
  { icon: Users, label: "Customers", href: "/mobile/customers" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-t border-border">
      <nav className="flex items-center justify-around h-16 pb-safe">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
