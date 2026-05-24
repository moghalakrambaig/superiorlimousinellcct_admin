import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Mail, Phone, MapPin, Building2, Car, Pencil, Plus, MessageSquare,
  CreditCard, UserCheck, Calendar, CheckCircle2, DollarSign, Trash2, Send,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CustomerForm } from "@/components/shared/CustomerForm";
import { BookingForm, RIDE_STATUS, PAYMENT_STATUS } from "@/components/shared/BookingForm";
import { RideBadge, PayBadge } from "@/components/shared/StatusBadges";
import type { Database } from "@/integrations/supabase/types";

type Customer = Database["public"]["Tables"]["customers"]["Row"] & {
  chauffeur_preference?: string | null;
  billing_details?: string | null;
  account_status?: string | null;
  date_of_birth?: string | null;
  billing_address?: string | null;
  shipping_address?: string | null;
  id_type?: string | null;
  id_number?: string | null;
  card_holder_name?: string | null;
  card_brand?: string | null;
  card_last4?: string | null;
  card_exp_month?: number | null;
  card_exp_year?: number | null;
};
type Booking = Database["public"]["Tables"]["bookings"]["Row"];
type Note = Database["public"]["Tables"]["customer_notes"]["Row"];

export const Route = createFileRoute("/mobile/_authenticated/customers/$id")({
  component: MobileCustomerDetail,
});

function MobileCustomerDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [activeTab, setActiveTab] = useState("info");

  const load = async () => {
    const [c, b, n] = await Promise.all([
      supabase.from("customers").select("*").eq("id", id).maybeSingle(),
      supabase.from("bookings").select("*").eq("customer_id", id).order("booking_date", { ascending: false }),
      supabase.from("customer_notes").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
    ]);
    if (c.error || !c.data) { toast.error("Customer not found"); navigate({ to: "/mobile/customers" }); return; }
    setCustomer(c.data as Customer);
    setBookings(b.data ?? []);
    setNotes(n.data ?? []);
  };
  useEffect(() => { load(); }, [id]);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = useMemo(
    () => bookings.filter((b) => b.booking_date >= today && b.ride_status !== "cancelled" && b.ride_status !== "completed"),
    [bookings, today],
  );
  
  const totalTrips = bookings.length;
  const totalSpent = bookings
    .filter((b) => b.payment_status === "paid")
    .reduce((s, b) => s + Number(b.amount ?? 0), 0);
    
  const addNote = async () => {
    if (!newNote.trim()) return;
    const { error } = await supabase.from("customer_notes").insert({ customer_id: id, body: newNote.trim() });
    if (error) return toast.error(error.message);
    setNewNote("");
    toast.success("Note added");
    load();
  };

  const handleDelete = async () => {
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Customer deleted");
    navigate({ to: "/mobile/customers" });
  };

  if (!customer) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading…</div>;
  }

  const status = customer.account_status ?? "active";
  const statusColor: Record<string, string> = {
    active: "border-emerald-500/40 text-emerald-500 bg-emerald-500/10",
    vip: "border-gold/50 text-gold bg-gold-soft",
    inactive: "border-muted-foreground/40 text-muted-foreground bg-muted/30",
    suspended: "border-rose-500/40 text-rose-500 bg-rose-500/10",
  };

  return (
    <div className="space-y-4 animate-fade-in pb-10">
      <Link to="/mobile/customers" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground p-1 -ml-1">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="bg-card border border-border/50 rounded-xl p-5 shadow-sm space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-bl-full -z-0"></div>
        
        <div className="relative z-10 space-y-2">
          <h1 className="text-2xl font-display font-semibold">{customer.full_name}</h1>
          
          <div className="flex gap-2 flex-wrap items-center">
            <Badge variant="outline" className={`capitalize font-medium ${statusColor[status] ?? statusColor.active}`}>
              {status}
            </Badge>
            {(customer.tags ?? []).map((t) => (
              <Badge key={t} variant="outline" className="bg-gold/10 text-gold border-gold/40 font-medium">
                {t}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 relative z-10">
          <Button onClick={() => setEditOpen(true)} variant="outline" className="w-full bg-background/50">
            <Pencil className="h-4 w-4 mr-2" /> Edit
          </Button>
          <Button onClick={() => { setEditingBooking(null); setBookOpen(true); }} className="w-full gradient-gold text-primary-foreground border-0">
            <Plus className="h-4 w-4 mr-2" /> Book
          </Button>
        </div>
        
        <div className="flex gap-4 pt-2 border-t border-border/40 text-sm">
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total Trips</div>
            <div className="font-semibold">{totalTrips}</div>
          </div>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total Spent</div>
            <div className="font-semibold text-gold">${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 0 })}</div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 bg-muted/30 border border-border/50">
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4 mt-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-card border border-border/50 rounded-xl p-4 space-y-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gold uppercase tracking-wider">Contact</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span className="break-all">{customer.phone || "—"}</span>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span className="break-all">{customer.email || "—"}</span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span className="whitespace-pre-wrap leading-relaxed">{customer.home_address || "—"}</span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-xl p-4 space-y-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gold uppercase tracking-wider">Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Company</div>
                  <div>{customer.company_name || "—"}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Car className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Vehicle Preference</div>
                  <div>{customer.preferred_vehicle || "—"}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CreditCard className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Payment on File</div>
                  {customer.card_last4 ? (
                    <div>{customer.card_brand ?? "Card"} •••• {customer.card_last4}</div>
                  ) : (
                    <div className="text-muted-foreground italic">None</div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setConfirmDel(true)}>
            <Trash2 className="w-4 h-4 mr-2" /> Delete Customer
          </Button>
        </TabsContent>

        <TabsContent value="history" className="space-y-3 mt-4 animate-in fade-in slide-in-from-bottom-2">
          {bookings.length === 0 ? (
            <div className="text-center p-8 bg-muted/20 rounded-xl border border-border/50">
              <p className="text-sm text-muted-foreground">No ride history.</p>
            </div>
          ) : (
            bookings.map((b) => (
              <div key={b.id} onClick={() => { setEditingBooking(b); setBookOpen(true); }} className="bg-card border border-border/50 p-4 rounded-xl shadow-sm space-y-3 active:scale-[0.98] transition-transform">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{formatDate(b.booking_date)}</div>
                    <div className="text-xs text-muted-foreground">{b.booking_time?.slice(0, 5)}</div>
                  </div>
                  <div className="font-bold text-right">${Number(b.amount).toFixed(2)}</div>
                </div>

                <div className="flex flex-col gap-1.5 bg-muted/30 p-2.5 rounded-lg text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-gold mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{b.pickup_location}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{b.dropoff_location}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <RideBadge status={b.ride_status} />
                  <PayBadge status={b.payment_status} />
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="notes" className="space-y-4 mt-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex gap-2">
            <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add a note…" rows={2} className="resize-none" />
            <Button onClick={addNote} className="h-auto gradient-gold text-primary-foreground border-0 px-3">Add</Button>
          </div>
          
          <div className="space-y-3">
            {notes.length === 0 && <p className="text-muted-foreground text-sm text-center py-6">No notes yet.</p>}
            {notes.map((n) => (
              <div key={n.id} className="bg-card border border-border/50 p-3.5 rounded-xl shadow-sm">
                <div className="text-sm whitespace-pre-wrap">{n.body}</div>
                <div className="text-[10px] text-muted-foreground mt-2 font-medium">
                  {formatDate(n.created_at)} at {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <CustomerForm open={editOpen} onOpenChange={setEditOpen} initial={customer} onSaved={load} />
      <BookingForm open={bookOpen} onOpenChange={setBookOpen} initial={editingBooking} defaultCustomerId={id} onSaved={load} />

      <AlertDialog open={confirmDel} onOpenChange={setConfirmDel}>
        <AlertDialogContent className="w-[90vw] max-w-[400px] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes this customer and all their bookings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <AlertDialogCancel className="w-full mt-0">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground w-full">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
