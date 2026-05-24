import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function RideBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "border-amber-500/40 text-amber-400 bg-amber-500/10",
    confirmed: "border-sky-400/40 text-sky-300 bg-sky-400/10",
    completed: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
    cancelled: "border-rose-500/40 text-rose-300 bg-rose-500/10",
  };
  return <Badge variant="outline" className={cn("capitalize", map[status])}>{status}</Badge>;
}

export function PayBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
    unpaid: "border-rose-500/40 text-rose-300 bg-rose-500/10",
    partial: "border-amber-500/40 text-amber-400 bg-amber-500/10",
    refunded: "border-muted-foreground/40 text-muted-foreground bg-muted/30",
  };
  return <Badge variant="outline" className={cn("capitalize", map[status])}>{status}</Badge>;
}
