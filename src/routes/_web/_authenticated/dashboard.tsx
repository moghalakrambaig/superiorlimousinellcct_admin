import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, CarFront, Calendar as CalendarIcon, DollarSign, TrendingUp, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { RideBadge, PayBadge } from "@/components/shared/StatusBadges";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_web/_authenticated/dashboard")({
  component: Dashboard,
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

function Dashboard() {
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
        .limit(6),
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
    <div className="p-4 md:p-10 space-y-6 md:space-y-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2 flex items-center gap-2">
            <Crown className="h-3 w-3" /> Admin Dashboard
          </div>
          <h1 className="text-3xl md:text-4xl font-display">
            Good evening, <span className="gradient-gold-text">welcome back</span>
          </h1>
          <p className="text-muted-foreground mt-1">Your fleet at a glance.</p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Customers" value={stats?.totalCustomers} icon={Users} />
        <StatCard label="Total Bookings" value={stats?.totalBookings} icon={CarFront} />
        <StatCard label="Today's Rides" value={stats?.todaysRides} icon={CalendarIcon} />
        <StatCard
          label="Revenue (Paid)"
          value={stats ? `$${stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : undefined}
          icon={DollarSign}
        />
      </div>

      <section className="luxury-card rounded-xl p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-display flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-gold" /> Recent Bookings
            </h2>
            <p className="text-xs text-muted-foreground">Your latest 6 reservations.</p>
          </div>
          <Link to="/bookings" className="text-sm text-gold hover:underline">View all →</Link>
        </div>
        <div className="overflow-x-auto -mx-4 md:-mx-6 px-4 md:px-6">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="text-left px-6 py-3">Customer</th>
                <th className="text-left px-6 py-3">Trip</th>
                <th className="text-left px-6 py-3">When</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-left px-6 py-3">Payment</th>
                <th className="text-right px-6 py-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                  No bookings yet.
                </td></tr>
              )}
              {recent.map((b) => (
                <tr key={b.id} className="border-b border-border/50 hover:bg-muted/40">
                  <td className="px-6 py-3 font-medium">
                    <Link to="/customers/$id" params={{ id: b.customer_id }} className="hover:text-gold transition-colors">
                      {b.customers?.full_name ?? "—"}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {b.pickup_location} <span className="text-gold">→</span> {b.dropoff_location}
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">{b.booking_date} · {b.booking_time.slice(0, 5)}</td>
                  <td className="px-6 py-3"><RideBadge status={b.ride_status} /></td>
                  <td className="px-6 py-3"><PayBadge status={b.payment_status} /></td>
                  <td className="px-6 py-3 text-right font-medium">${Number(b.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
    <div className="luxury-card rounded-xl p-4 md:p-5 group hover:gold-glow transition-shadow">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="h-9 w-9 grid place-items-center rounded-md bg-gold-soft border border-gold/20">
          <Icon className="h-4 w-4 text-gold" />
        </div>
      </div>
      <div className="mt-4 text-3xl font-display">
        {value === undefined ? <Skeleton className="h-8 w-24" /> : value}
      </div>
    </div>
  );
}
