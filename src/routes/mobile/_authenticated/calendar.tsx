import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RideBadge } from "@/components/shared/StatusBadges";

export const Route = createFileRoute("/mobile/_authenticated/calendar")({
  component: MobileCalendarPage,
});

type B = {
  id: string;
  booking_date: string;
  booking_time: string;
  pickup_location: string;
  dropoff_location: string;
  ride_status: string;
  customers: { full_name: string } | null;
};

function MobileCalendarPage() {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [bookings, setBookings] = useState<B[]>([]);

  useEffect(() => {
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    supabase
      .from("bookings")
      .select("id, booking_date, booking_time, pickup_location, dropoff_location, ride_status, customers(full_name)")
      .gte("booking_date", fmt(start))
      .lte("booking_date", fmt(end))
      .order("booking_time")
      .then(({ data }) => setBookings((data as B[]) ?? []));
  }, [cursor]);

  const byDate = useMemo(() => {
    const map = new Map<string, B[]>();
    bookings.forEach((b) => {
      const arr = map.get(b.booking_date) ?? [];
      arr.push(b);
      map.set(b.booking_date, arr);
    });
    // Sort keys (dates)
    return new Map([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  }, [bookings]);

  const monthLabel = cursor.toLocaleString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="space-y-4 animate-fade-in pb-10">
      <header>
        <h1 className="text-2xl font-display font-semibold">Schedule</h1>
      </header>

      <div className="bg-card border border-border/50 rounded-xl p-3 shadow-sm flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="font-display font-semibold text-lg flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-gold" />
          {monthLabel}
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="space-y-6 mt-4">
        {byDate.size === 0 ? (
          <div className="text-center p-8 bg-muted/20 rounded-xl border border-border/50">
            <p className="text-sm text-muted-foreground">No bookings this month.</p>
          </div>
        ) : (
          Array.from(byDate.entries()).map(([dateStr, dayBookings]) => {
            const dateObj = new Date(dateStr + "T00:00:00");
            const dayName = dateObj.toLocaleDateString(undefined, { weekday: 'short' });
            const dayNum = dateObj.getDate();
            const isToday = dateStr === new Date().toISOString().slice(0, 10);

            return (
              <div key={dateStr} className="space-y-3">
                <div className="flex items-baseline gap-2 sticky top-14 bg-background/95 py-2 backdrop-blur z-10 border-b border-border/40">
                  <span className={`text-xl font-bold ${isToday ? 'text-gold' : ''}`}>{dayNum}</span>
                  <span className={`text-sm font-medium ${isToday ? 'text-gold/80' : 'text-muted-foreground uppercase tracking-wider'}`}>{dayName}</span>
                  {isToday && <span className="ml-2 text-[10px] bg-gold/20 text-gold px-2 py-0.5 rounded-full uppercase font-bold tracking-widest">Today</span>}
                </div>

                <div className="space-y-3">
                  {dayBookings.map((b) => (
                    <div key={b.id} className="bg-card border border-border/50 p-3.5 rounded-xl shadow-sm space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm font-bold text-gold">{b.booking_time?.slice(0, 5)}</div>
                          <div className="font-semibold text-base mt-0.5">{b.customers?.full_name ?? "Unknown"}</div>
                        </div>
                        <RideBadge status={b.ride_status} />
                      </div>
                      <div className="bg-muted/30 rounded-lg p-2 text-xs flex flex-col gap-1.5 mt-2">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <span className="line-clamp-1">{b.pickup_location}</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                          <span className="line-clamp-1">{b.dropoff_location}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
