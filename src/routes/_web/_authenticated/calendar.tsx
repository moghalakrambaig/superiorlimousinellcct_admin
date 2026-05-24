import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RideBadge } from "@/components/shared/StatusBadges";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_web/_authenticated/calendar")({
  component: CalendarPage,
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

function CalendarPage() {
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

  const grid = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startOffset = first.getDay();
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const byDate = useMemo(() => {
    const map = new Map<string, B[]>();
    bookings.forEach((b) => {
      const arr = map.get(b.booking_date) ?? [];
      arr.push(b);
      map.set(b.booking_date, arr);
    });
    return map;
  }, [bookings]);

  const monthLabel = cursor.toLocaleString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="p-4 md:p-10 space-y-4 md:space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">Schedule</div>
          <h1 className="text-3xl md:text-4xl font-display">Calendar</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="font-display text-lg w-44 text-center">{monthLabel}</div>
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="luxury-card rounded-xl p-4 overflow-x-auto">
        <div className="min-w-[700px]">
          <div className="grid grid-cols-7 gap-px text-xs uppercase tracking-wider text-muted-foreground mb-2">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <div key={d} className="px-2 py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-2">
          {grid.map((d, i) => {
            const key = d ? d.toISOString().slice(0,10) : `empty-${i}`;
            const dayBookings = d ? (byDate.get(key) ?? []) : [];
            const today = d && new Date().toISOString().slice(0,10) === key;
            return (
              <div key={key} className={
                "min-h-[100px] rounded-md border p-2 text-xs " +
                (d ? "bg-card border-border" : "bg-transparent border-transparent") +
                (today ? " ring-1 ring-gold" : "")
              }>
                {d && (
                  <>
                    <div className={"font-medium mb-1 " + (today ? "text-gold" : "text-muted-foreground")}>{d.getDate()}</div>
                    <div className="space-y-1">
                      {dayBookings.slice(0, 3).map((b) => (
                        <div key={b.id} className="truncate bg-gold-soft border border-gold/20 rounded px-1.5 py-0.5">
                          <span className="text-gold font-medium">{b.booking_time?.slice(0,5) ?? ""}</span>{" "}
                          <span className="text-foreground">{b.customers?.full_name ?? "—"}</span>
                        </div>
                      ))}
                      {dayBookings.length > 3 && <div className="text-muted-foreground">+{dayBookings.length - 3} more</div>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
          </div>
        </div>
      </div>

      <div className="luxury-card rounded-xl p-4">
        <h2 className="font-display text-lg mb-3">All bookings this month</h2>
        <div className="space-y-1 text-sm">
          {bookings.length === 0 && <p className="text-muted-foreground">No bookings.</p>}
          {bookings.map((b) => (
            <div key={b.id} className="flex items-center gap-3 px-2 py-1.5 hover:bg-muted/30 rounded-md">
              <div className="text-gold w-32 text-xs shrink-0">{formatDate(b.booking_date)} {b.booking_time?.slice(0,5) ?? ""}</div>
              <div className="flex-1 truncate">{b.customers?.full_name} — {b.pickup_location} → {b.dropoff_location}</div>
              <RideBadge status={b.ride_status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
