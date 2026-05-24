import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, CarFront, Calendar as CalendarIcon, DollarSign, TrendingUp, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { RideBadge, PayBadge } from "@/components/shared/StatusBadges";

export const Route = createFileRoute("/mobile/_authenticated/dashboard")({
  component: MobileDashboard,
});

type Stats = {
  totalCustomers: number;
  totalBookings: number;
  todaysRides: number;
  revenue: number;
};

type RecentBooking = {
  id: string;
  customer_id: string;
  pickup_location: string;
  dropoff_location: string;
  booking_date: string;
  booking_time: string;
  ride_status: string;
  payment_status: string;
  amount: number;
  customers: { full_name: string } | null;
};

function MobileDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentBooking[]>([]);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    Promise.all([
      supabase.from("customers").select("id", { count: "exact", head: true }),
      supabase.from("bookings").select("id", { count: "exact", head: true }),
      supabase.from("bookings").select("id", { count: "exact", head: true }).eq("booking_date", today),
      supabase.from("bookings").select("amount").eq("payment_status", "paid"),
      supabase
        .from("bookings")
        .select("id,customer_id,pickup_location,dropoff_location,booking_date,booking_time,ride_status,payment_status,amount,customers(full_name)")
        .order("created_at", { ascending: false })
        .limit(5),
    ]).then(([c, b, t, paid, rec]) => {
      const revenue = (paid.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);
      setStats({
        totalCustomers: c.count ?? 0,
        totalBookings: b.count ?? 0,
        todaysRides: t.count ?? 0,
        revenue,
      });
      setRecent((rec.data as RecentBooking[]) ?? []);
    });
  }, []);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <header>
        <h1 className="text-2xl font-display font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Your fleet overview.</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Customers" value={stats?.totalCustomers} icon={Users} />
        <StatCard label="Bookings" value={stats?.totalBookings} icon={CarFront} />
        <StatCard label="Today" value={stats?.todaysRides} icon={CalendarIcon} />
        <StatCard
          label="Revenue"
          value={stats ? `$${stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 0 })}` : undefined}
          icon={DollarSign}
        />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display flex items-center gap-2 font-medium">
            <TrendingUp className="h-4 w-4 text-gold" /> Recent
          </h2>
          <Link to="/mobile/bookings" className="text-xs text-gold">See all</Link>
        </div>
        
        <div className="space-y-3">
          {recent.length === 0 && (
            <div className="text-center p-6 bg-muted/20 rounded-xl border border-border/50">
              <p className="text-sm text-muted-foreground">No bookings yet.</p>
            </div>
          )}
          {recent.map((b) => (
            <div key={b.id} className="bg-card border border-border/50 p-4 rounded-xl shadow-sm flex flex-col gap-3 active:scale-[0.98] transition-transform">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-sm">{b.customers?.full_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{b.booking_date} · {b.booking_time.slice(0, 5)}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm">${Number(b.amount).toFixed(2)}</div>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                <span className="truncate max-w-[120px]">{b.pickup_location}</span>
                <span className="text-gold flex-shrink-0">→</span>
                <span className="truncate max-w-[120px]">{b.dropoff_location}</span>
              </div>

              <div className="flex items-center justify-between mt-1">
                <div className="flex gap-2">
                  <RideBadge status={b.ride_status} />
                  <PayBadge status={b.payment_status} />
                </div>
                {/* Could navigate to mobile booking detail if it existed, for now just show chevron */}
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string | undefined;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-card border border-border/50 rounded-xl p-3 shadow-sm flex flex-col justify-between min-h-[90px]">
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4 text-gold/80" />
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
      </div>
      <div className="mt-2 text-xl font-display font-semibold">
        {value === undefined ? <Skeleton className="h-6 w-12" /> : value}
      </div>
    </div>
  );
}
