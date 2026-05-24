import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Mail, Phone, MapPin, Building2, Car, Pencil, Plus, MessageSquare,
  CreditCard, UserCheck, Calendar, CheckCircle2, DollarSign, Trash2, FileText, Send,
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

export const Route = createFileRoute("/_web/_authenticated/customers/$id")({
  component: CustomerDetail,
});

function CustomerDetail() {
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
  const [activeTab, setActiveTab] = useState("history");

  const load = async () => {
    const [c, b, n] = await Promise.all([
      supabase.from("customers").select("*").eq("id", id).maybeSingle(),
      supabase.from("bookings").select("*").eq("customer_id", id).order("booking_date", { ascending: false }),
      supabase.from("customer_notes").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
    ]);
    if (c.error || !c.data) { toast.error("Customer not found"); navigate({ to: "/customers" }); return; }
    setCustomer(c.data as Customer);
    setBookings(b.data ?? []);
    setNotes(n.data ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = useMemo(
    () => bookings.filter((b) => b.booking_date >= today && b.ride_status !== "cancelled" && b.ride_status !== "completed"),
    [bookings, today],
  );
  const completed = useMemo(() => bookings.filter((b) => b.ride_status === "completed"), [bookings]);
  const totalTrips = bookings.length;
  const totalSpent = bookings
    .filter((b) => b.payment_status === "paid")
    .reduce((s, b) => s + Number(b.amount ?? 0), 0);
  const lastRide = useMemo(() => {
    const past = bookings.filter((b) => b.booking_date <= today).sort((a, b) => b.booking_date.localeCompare(a.booking_date))[0];
    return past?.booking_date ?? null;
  }, [bookings, today]);

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
    navigate({ to: "/customers" });
  };

  const sendInvoice = () => {
    if (!customer?.email) {
      toast.error("No email on file for this customer");
      return;
    }
    const unpaid = bookings.filter((b) => b.payment_status !== "paid" && b.payment_status !== "refunded");
    const total = unpaid.reduce((s, b) => s + Number(b.amount ?? 0), 0);
    const lines = unpaid.length
      ? unpaid.map((b) => `• ${formatDate(b.booking_date)} ${b.pickup_location} → ${b.dropoff_location}  $${Number(b.amount).toFixed(2)}`).join("%0D%0A")
      : "All bookings are currently settled.";
    const subject = encodeURIComponent(`Superior Limousine LLC — Invoice for ${customer.full_name}`);
    const body =
      `Dear ${customer.full_name},%0D%0A%0D%0A` +
      `Please find your invoice from Superior Limousine LLC Executive Transportation below.%0D%0A%0D%0A` +
      `${lines}%0D%0A%0D%0A` +
      `Outstanding total: $${total.toFixed(2)}%0D%0A%0D%0A` +
      `Thank you for choosing Superior Limousine LLC.`;
    window.location.href = `mailto:${customer.email}?subject=${subject}&body=${body}`;
  };

  if (!customer) {
    return <div className="p-10 text-muted-foreground">Loading…</div>;
  }

  const status = customer.account_status ?? "active";
  const statusColor: Record<string, string> = {
    active: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
    vip: "border-gold/50 text-gold bg-gold-soft",
    inactive: "border-muted-foreground/40 text-muted-foreground bg-muted/30",
    suspended: "border-rose-500/40 text-rose-300 bg-rose-500/10",
  };

  return (
    <div className="p-4 md:p-10 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center text-sm text-muted-foreground gap-2 mb-2">
        <Link to="/customers" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gold">
          <ArrowLeft className="h-4 w-4" /> Back to customers
        </Link>
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Superior Limousine LLC · Executive Transportation
        </div>
      </div>

      {/* Hero card */}
      <div className="luxury-card rounded-xl p-6 md:p-8">
        <div className="flex flex-wrap gap-6 items-start justify-between">
          <div className="space-y-3 min-w-0">
            <div className="text-xs uppercase tracking-[0.3em] text-gold">Client Profile</div>
            <h1 className="text-3xl md:text-4xl font-display">{customer.full_name}</h1>
            <div className="flex gap-2 flex-wrap items-center">
              <Badge variant="outline" className={"capitalize " + (statusColor[status] ?? statusColor.active)}>
                {status}
              </Badge>
              {(customer.tags ?? []).map((t) => (
                <Badge key={t} variant="outline" className="bg-gold-soft text-gold border-gold/40">{t}</Badge>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setEditOpen(true)} variant="outline" size="sm">
              <Pencil className="h-4 w-4 mr-2" /> Edit Customer
            </Button>
            <Button onClick={() => { setEditingBooking(null); setBookOpen(true); }} size="sm" className="gradient-gold text-primary-foreground border-0">
              <Plus className="h-4 w-4 mr-2" /> Create Reservation
            </Button>
            <Button onClick={sendInvoice} variant="outline" size="sm">
              <Send className="h-4 w-4 mr-2" /> Send Invoice
            </Button>
            <Button onClick={() => {
              setActiveTab("history");
              document.getElementById("tabs-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }} variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" /> View Ride History
            </Button>
            <Button onClick={() => setConfirmDel(true)} variant="outline" size="sm" className="border-rose-500/40 text-rose-300 hover:bg-rose-500/10">
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <Stat icon={<Calendar className="h-4 w-4" />} label="Total Trips" value={totalTrips} />
          <Stat icon={<DollarSign className="h-4 w-4" />} label="Total Spent" value={`$${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
          <Stat icon={<CheckCircle2 className="h-4 w-4" />} label="Last Ride" value={lastRide ? formatDate(lastRide) : "—"} />
          <Stat icon={<UserCheck className="h-4 w-4" />} label="Client Since" value={formatDate(customer.created_at)} />
        </div>
      </div>

      {/* Info grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Section title="Contact">
          <InfoRow icon={<Mail className="h-4 w-4 text-gold" />} label="Email" value={customer.email} />
          <InfoRow icon={<Phone className="h-4 w-4 text-gold" />} label="Phone" value={customer.phone} />
          <InfoRow icon={<Calendar className="h-4 w-4 text-gold" />} label="Date of Birth" value={formatDate(customer.date_of_birth)} />
        </Section>
        <Section title="Addresses">
          <InfoRow icon={<MapPin className="h-4 w-4 text-gold" />} label="Home" value={customer.home_address} multiline />
          <InfoRow icon={<MapPin className="h-4 w-4 text-gold" />} label="Billing" value={customer.billing_address} multiline />
          <InfoRow icon={<MapPin className="h-4 w-4 text-gold" />} label="Shipping" value={customer.shipping_address} multiline />
        </Section>
        <Section title="Account">
          <InfoRow icon={<Building2 className="h-4 w-4 text-gold" />} label="Company" value={customer.company_name} />
          <InfoRow icon={<UserCheck className="h-4 w-4 text-gold" />} label="Status" value={status} capitalize />
          <InfoRow icon={<FileText className="h-4 w-4 text-gold" />} label={customer.id_type || "ID"} value={customer.id_number} />
          <InfoRow icon={<Calendar className="h-4 w-4 text-gold" />} label="Client Since" value={formatDate(customer.created_at)} />
        </Section>
        <Section title="Service Preferences">
          <InfoRow icon={<Car className="h-4 w-4 text-gold" />} label="Preferred Vehicle" value={customer.preferred_vehicle} />
          <InfoRow icon={<UserCheck className="h-4 w-4 text-gold" />} label="Chauffeur" value={customer.chauffeur_preference} />
          <InfoRow icon={<MessageSquare className="h-4 w-4 text-gold" />} label="Special Requests" value={customer.notes} multiline />
        </Section>
        <Section title="Payment on File" className="md:col-span-2 lg:col-span-2">
          {customer.card_last4 ? (
            <>
              <InfoRow
                icon={<CreditCard className="h-4 w-4 text-gold" />}
                label="Card"
                value={`${customer.card_brand ?? "Card"} •••• ${customer.card_last4}${
                  customer.card_exp_month && customer.card_exp_year
                    ? `   exp ${String(customer.card_exp_month).padStart(2, "0")}/${customer.card_exp_year}`
                    : ""
                }`}
              />
              <InfoRow icon={<UserCheck className="h-4 w-4 text-gold" />} label="Cardholder" value={customer.card_holder_name} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground italic">No card on file.</p>
          )}
          <InfoRow icon={<FileText className="h-4 w-4 text-gold" />} label="Billing Terms" value={customer.billing_details} multiline />
          <p className="text-[10px] text-muted-foreground/70 pt-2">
            Only non-sensitive card metadata is stored. Full card numbers and CVVs are never retained.
          </p>
        </Section>
        <Section title="Upcoming Bookings" className="md:col-span-2 lg:col-span-3">
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming reservations.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.slice(0, 4).map((b) => (
                <li key={b.id} className="flex items-center justify-between text-sm border-l-2 border-gold/40 pl-3 py-1">
                  <div>
                    <div className="font-medium">{formatDate(b.booking_date)} · {b.booking_time?.slice(0, 5) ?? ""}</div>
                    <div className="text-xs text-muted-foreground">{b.pickup_location} → {b.dropoff_location}</div>
                  </div>
                  <RideBadge status={b.ride_status} />
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <div id="tabs-section" className="scroll-mt-4 md:scroll-mt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-card border border-border flex overflow-x-auto hide-scrollbar justify-start">
          <TabsTrigger value="history">Ride History ({bookings.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="luxury-card rounded-xl p-4">
          <BookingsTable bookings={bookings} onRowClick={(b) => { setEditingBooking(b); setBookOpen(true); }} />
        </TabsContent>
        <TabsContent value="completed" className="luxury-card rounded-xl p-4">
          <BookingsTable bookings={completed} onRowClick={(b) => { setEditingBooking(b); setBookOpen(true); }} />
        </TabsContent>

        <TabsContent value="notes" className="luxury-card rounded-xl p-6 space-y-4">
          <div className="flex gap-2">
            <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add a note about this customer…" rows={2} />
            <Button onClick={addNote} className="gradient-gold text-primary-foreground border-0">Add</Button>
          </div>
          <div className="space-y-3">
            {notes.length === 0 && <p className="text-muted-foreground text-sm text-center py-6">No notes yet.</p>}
            {notes.map((n) => (
              <div key={n.id} className="flex gap-3 border-l-2 border-gold/40 pl-4 py-1">
                <MessageSquare className="h-4 w-4 text-gold mt-1 shrink-0" />
                <div className="flex-1">
                  <div className="text-sm whitespace-pre-wrap">{n.body}</div>
                  <div className="text-xs text-muted-foreground mt-1">{formatDate(n.created_at)} {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
      </div>

      <CustomerForm open={editOpen} onOpenChange={setEditOpen} initial={customer} onSaved={load} />
      <BookingForm open={bookOpen} onOpenChange={setBookOpen} initial={editingBooking} defaultCustomerId={id} onSaved={load} />

      <AlertDialog open={confirmDel} onOpenChange={setConfirmDel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <b>{customer.full_name}</b> along with their bookings &amp; notes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="luxury-card rounded-md px-4 py-3">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span className="text-gold">{icon}</span>{label}
      </div>
      <div className="font-display text-xl text-gold mt-1 truncate">{value}</div>
    </div>
  );
}

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={"luxury-card rounded-xl p-5 " + (className ?? "")}>
      <h3 className="text-[10px] uppercase tracking-[0.25em] text-gold mb-4">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function InfoRow({ icon, label, value, capitalize, multiline }: {
  icon: React.ReactNode; label: string; value?: string | null; capitalize?: boolean; multiline?: boolean;
}) {
  return (
    <div className="flex gap-3 items-start text-sm">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        {value ? (
          <div className={"text-foreground " + (capitalize ? "capitalize " : "") + (multiline ? "whitespace-pre-wrap" : "break-words")}>
            {value}
          </div>
        ) : (
          <div className="text-muted-foreground italic">Not set</div>
        )}
      </div>
    </div>
  );
}

function BookingsTable({ bookings, onRowClick }: { bookings: Booking[]; onRowClick: (b: Booking) => void }) {
  return (
    <div className="overflow-x-auto -mx-4 md:-mx-4 px-4 md:px-0">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
          <tr>
            <th className="text-left px-3 py-2">Date</th>
            <th className="text-left px-3 py-2">Trip</th>
            <th className="text-left px-3 py-2">Chauffeur</th>
            <th className="text-left px-3 py-2">Status</th>
            <th className="text-left px-3 py-2">Payment</th>
            <th className="text-right px-3 py-2">Amount</th>
          </tr>
        </thead>
        <tbody>
          {bookings.length === 0 && (
            <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No bookings to show.</td></tr>
          )}
          {bookings.map((b) => (
            <tr key={b.id} className="border-b border-border/50 cursor-pointer hover:bg-muted/30" onClick={() => onRowClick(b)}>
              <td className="px-3 py-2 whitespace-nowrap">{formatDate(b.booking_date)} <span className="text-muted-foreground">{b.booking_time?.slice(0,5) ?? ""}</span></td>
              <td className="px-3 py-2 text-muted-foreground">{b.pickup_location} <span className="text-gold">→</span> {b.dropoff_location}</td>
              <td className="px-3 py-2">{b.chauffeur_assigned ?? "—"}</td>
              <td className="px-3 py-2"><RideBadge status={b.ride_status} /></td>
              <td className="px-3 py-2"><PayBadge status={b.payment_status} /></td>
              <td className="px-3 py-2 text-right">${Number(b.amount).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
