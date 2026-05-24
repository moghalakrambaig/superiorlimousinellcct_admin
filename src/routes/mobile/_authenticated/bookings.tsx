import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, Calendar as CalendarIcon, MapPin, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BookingForm } from "@/components/shared/BookingForm";
import { RideBadge, PayBadge } from "@/components/shared/StatusBadges";
import { formatDate } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Database } from "@/integrations/supabase/types";

type BookingRow = Database["public"]["Tables"]["bookings"]["Row"] & {
  customers: { full_name: string } | null;
};

export const Route = createFileRoute("/mobile/_authenticated/bookings")({
  component: MobileBookingsPage,
});

function MobileBookingsPage() {
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BookingRow | null>(null);
  const [confirmDel, setConfirmDel] = useState<BookingRow | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("*, customers(full_name)")
      .order("booking_date", { ascending: false })
      .order("booking_time", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as BookingRow[]) ?? []);
  };
  
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((b) => {
      return [b.customers?.full_name, b.pickup_location, b.dropoff_location, b.chauffeur_assigned]
        .some((v) => (v ?? "").toString().toLowerCase().includes(needle));
    });
  }, [rows, q]);

  const del = async () => {
    if (!confirmDel) return;
    const { error } = await supabase.from("bookings").delete().eq("id", confirmDel.id);
    if (error) toast.error(error.message); else toast.success("Booking deleted");
    setConfirmDel(null);
    load();
  };

  return (
    <div className="space-y-4 animate-fade-in pb-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">Bookings</h1>
        </div>
        <Button size="icon" className="h-10 w-10 rounded-full gradient-gold" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-5 w-5 text-primary-foreground" />
        </Button>
      </header>

      <div className="relative">
        <Search className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input 
          value={q} 
          onChange={(e) => setQ(e.target.value)} 
          placeholder="Search bookings…" 
          className="pl-10 h-12 bg-card border-border/50 rounded-xl" 
        />
      </div>

      <div className="space-y-3 mt-4">
        {filtered.length === 0 ? (
          <div className="text-center p-8 bg-muted/20 rounded-xl border border-border/50">
            <p className="text-sm text-muted-foreground">No bookings found.</p>
          </div>
        ) : (
          filtered.map((b) => (
            <div key={b.id} className="bg-card border border-border/50 p-4 rounded-xl shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-base">{b.customers?.full_name ?? "Unknown Customer"}</div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    <span>{formatDate(b.booking_date)} at {b.booking_time?.slice(0,5)}</span>
                  </div>
                </div>
                <div className="font-bold text-base text-right">
                  ${Number(b.amount).toFixed(2)}
                </div>
              </div>

              <div className="flex flex-col gap-1.5 bg-muted/30 p-2.5 rounded-lg text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gold mt-0.5 shrink-0" />
                  <span className="line-clamp-2">{b.pickup_location}</span>
                </div>
                <div className="pl-6 text-xs text-muted-foreground">↓ to</div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span className="line-clamp-2">{b.dropoff_location}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex gap-2">
                  <RideBadge status={b.ride_status} />
                  <PayBadge status={b.payment_status} />
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => { setEditing(b); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-destructive" onClick={() => setConfirmDel(b)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <BookingForm open={open} onOpenChange={setOpen} initial={editing} onSaved={load} />
      
      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent className="w-[90vw] max-w-[400px] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete booking?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <AlertDialogCancel className="w-full mt-0">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={del} className="bg-destructive text-destructive-foreground w-full">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
