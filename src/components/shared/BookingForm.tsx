import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];
type Customer = Database["public"]["Tables"]["customers"]["Row"];
type Ride = Database["public"]["Enums"]["ride_status"];
type Pay = Database["public"]["Enums"]["payment_status"];

const RIDE: Ride[] = ["pending", "confirmed", "completed", "cancelled"];
const PAY: Pay[] = ["unpaid", "paid", "partial", "refunded"];

const schema = z.object({
  customer_id: z.string().uuid("Pick a customer"),
  pickup_location: z.string().trim().min(1).max(200),
  dropoff_location: z.string().trim().min(1).max(200),
  booking_date: z.string().min(1),
  booking_time: z.string().min(1),
  chauffeur_assigned: z.string().trim().max(120).optional().or(z.literal("")),
  vehicle: z.string().trim().max(80).optional().or(z.literal("")),
  amount: z.coerce.number().min(0).max(1_000_000),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Booking | null;
  defaultCustomerId?: string;
  onSaved: () => void;
};

export function BookingForm({ open, onOpenChange, initial, defaultCustomerId, onSaved }: Props) {
  const [customers, setCustomers] = useState<Pick<Customer, "id" | "full_name">[]>([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    customer_id: "",
    pickup_location: "",
    dropoff_location: "",
    booking_date: "",
    booking_time: "",
    chauffeur_assigned: "",
    vehicle: "",
    amount: "0",
    notes: "",
    ride_status: "pending" as Ride,
    payment_status: "unpaid" as Pay,
  });

  useEffect(() => {
    if (!open) return;
    supabase.from("customers").select("id, full_name").order("full_name").then(({ data }) => {
      setCustomers(data ?? []);
    });
    if (initial) {
      setForm({
        customer_id: initial.customer_id,
        pickup_location: initial.pickup_location,
        dropoff_location: initial.dropoff_location,
        booking_date: initial.booking_date,
        booking_time: initial.booking_time,
        chauffeur_assigned: initial.chauffeur_assigned ?? "",
        vehicle: initial.vehicle ?? "",
        amount: String(initial.amount ?? 0),
        notes: initial.notes ?? "",
        ride_status: initial.ride_status,
        payment_status: initial.payment_status,
      });
    } else {
      const today = new Date().toISOString().slice(0, 10);
      setForm((f) => ({
        ...f,
        customer_id: defaultCustomerId ?? "",
        pickup_location: "",
        dropoff_location: "",
        booking_date: today,
        booking_time: "12:00",
        chauffeur_assigned: "",
        vehicle: "",
        amount: "0",
        notes: "",
        ride_status: "pending",
        payment_status: "unpaid",
      }));
    }
  }, [open, initial, defaultCustomerId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const payload = {
      ...parsed.data,
      chauffeur_assigned: parsed.data.chauffeur_assigned || null,
      vehicle: parsed.data.vehicle || null,
      notes: parsed.data.notes || null,
      ride_status: form.ride_status,
      payment_status: form.payment_status,
    };
    const res = initial
      ? await supabase.from("bookings").update(payload).eq("id", initial.id)
      : await supabase.from("bookings").insert(payload);
    setBusy(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success(initial ? "Booking updated" : "Booking created");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl luxury-card">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {initial ? "Edit Booking" : "New Booking"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Customer *" className="sm:col-span-2">
            <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select a customer" /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Pickup Location *">
            <Input value={form.pickup_location} onChange={(e) => setForm({ ...form, pickup_location: e.target.value })} required />
          </Field>
          <Field label="Dropoff Location *">
            <Input value={form.dropoff_location} onChange={(e) => setForm({ ...form, dropoff_location: e.target.value })} required />
          </Field>
          <Field label="Booking Date *">
            <Input type="date" value={form.booking_date} onChange={(e) => setForm({ ...form, booking_date: e.target.value })} required />
          </Field>
          <Field label="Booking Time *">
            <Input type="time" value={form.booking_time} onChange={(e) => setForm({ ...form, booking_time: e.target.value })} required />
          </Field>
          <Field label="Chauffeur Assigned">
            <Input value={form.chauffeur_assigned} onChange={(e) => setForm({ ...form, chauffeur_assigned: e.target.value })} />
          </Field>
          <Field label="Vehicle">
            <Input value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} placeholder="Mercedes S-Class" />
          </Field>
          <Field label="Ride Status">
            <Select value={form.ride_status} onValueChange={(v) => setForm({ ...form, ride_status: v as Ride })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{RIDE.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Payment Status">
            <Select value={form.payment_status} onValueChange={(v) => setForm({ ...form, payment_status: v as Pay })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PAY.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Amount (USD)">
            <Input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <DialogFooter className="sm:col-span-2 gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy} className="gradient-gold text-primary-foreground border-0">
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {initial ? "Save changes" : "Create booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={"space-y-2 " + (className ?? "")}>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export const RIDE_STATUS = RIDE;
export const PAYMENT_STATUS = PAY;
