import { Menu } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function MobileHeader({ title }: { title?: string }) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between h-14 px-4 pt-safe">
        <div className="flex items-center gap-3">
          <Menu className="w-6 h-6 text-foreground" />
          <h1 className="text-lg font-semibold truncate max-w-[200px]">
            {title || "Superior Limousine LLC"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
              {user.email?.charAt(0).toUpperCase() || "U"}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
