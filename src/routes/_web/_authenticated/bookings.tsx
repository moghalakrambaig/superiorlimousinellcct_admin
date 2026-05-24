import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, FileDown, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookingForm, RIDE_STATUS, PAYMENT_STATUS } from "@/components/shared/BookingForm";
import { RideBadge, PayBadge } from "@/components/shared/StatusBadges";
import { formatDate } from "@/lib/utils";
import { downloadCsv } from "@/lib/csv";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Database } from "@/integrations/supabase/types";

type BookingRow = Database["public"]["Tables"]["bookings"]["Row"] & {
  customers: { full_name: string } | null;
};

const PAGE_SIZE = 12;

export const Route = createFileRoute("/_web/_authenticated/bookings")({
  component: BookingsPage,
});

function BookingsPage() {
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [q, setQ] = useState("");
  const [ride, setRide] = useState("all");
  const [pay, setPay] = useState("all");
  const [page, setPage] = useState(0);
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
    return rows.filter((b) => {
      if (ride !== "all" && b.ride_status !== ride) return false;
      if (pay !== "all" && b.payment_status !== pay) return false;
      if (!needle) return true;
      return [b.customers?.full_name, b.pickup_location, b.dropoff_location, b.chauffeur_assigned]
        .some((v) => (v ?? "").toString().toLowerCase().includes(needle));
    });
  }, [rows, q, ride, pay]);

  useEffect(() => { setPage(0); }, [q, ride, pay]);
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const del = async () => {
    if (!confirmDel) return;
    const { error } = await supabase.from("bookings").delete().eq("id", confirmDel.id);
    if (error) toast.error(error.message); else toast.success("Booking deleted");
    setConfirmDel(null);
    load();
  };

  const exportRows = filtered.map((b) => ({
    Customer: b.customers?.full_name ?? "",
    Date: b.booking_date,
    Time: b.booking_time,
    Pickup: b.pickup_location,
    Dropoff: b.dropoff_location,
    Chauffeur: b.chauffeur_assigned ?? "",
    Vehicle: b.vehicle ?? "",
    Status: b.ride_status,
    Payment: b.payment_status,
    Amount: b.amount,
  }));

  return (
    <div className="p-4 md:p-10 space-y-4 md:space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">Reservations</div>
          <h1 className="text-3xl md:text-4xl font-display">Bookings</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => downloadCsv("bookings.csv", exportRows)}>
            <FileDown className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="gradient-gold text-primary-foreground border-0">
            <Plus className="h-4 w-4 mr-2" /> New Booking
          </Button>
        </div>
      </div>

      <div className="luxury-card rounded-xl p-4 flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-0 md:min-w-[240px] w-full">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search bookings…" className="pl-10" />
        </div>
        <Select value={ride} onValueChange={setRide}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ride status</SelectItem>
            {RIDE_STATUS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={pay} onValueChange={setPay}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All payments</SelectItem>
            {PAYMENT_STATUS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="luxury-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30">
              <tr>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">When</th>
                <th className="text-left px-4 py-3">Trip</th>
                <th className="text-left px-4 py-3">Chauffeur</th>
                <th className="text-left px-4 py-3">Ride</th>
                <th className="text-left px-4 py-3">Payment</th>
                <th className="text-right px-4 py-3">Amount</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-16 text-center text-muted-foreground">No bookings.</td></tr>
              )}
              {pageRows.map((b) => (
                <tr key={b.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium">
                    <Link to="/customers/$id" params={{ id: b.customer_id }} className="hover:text-gold transition-colors">
                      {b.customers?.full_name ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{formatDate(b.booking_date)} · {b.booking_time?.slice(0,5) ?? ""}</td>
                  <td className="px-4 py-2 text-muted-foreground">{b.pickup_location} <span className="text-gold">→</span> {b.dropoff_location}</td>
                  <td className="px-4 py-2">{b.chauffeur_assigned ?? "—"}</td>
                  <td className="px-4 py-2"><RideBadge status={b.ride_status} /></td>
                  <td className="px-4 py-2"><PayBadge status={b.payment_status} /></td>
                  <td className="px-4 py-2 text-right">${Number(b.amount).toFixed(2)}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(b); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setConfirmDel(b)}><Trash2 className="h-4 w-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-6 py-3 border-t border-border text-sm text-muted-foreground">
          <div>{filtered.length} bookings</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</Button>
            <span>Page {page + 1} / {pageCount}</span>
            <Button variant="outline" size="sm" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </div>

      <BookingForm open={open} onOpenChange={setOpen} initial={editing} onSaved={load} />
      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete booking?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={del} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
