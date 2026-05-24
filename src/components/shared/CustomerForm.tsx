import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldAlert } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type Tag = Database["public"]["Enums"]["customer_tag"];

const ALL_TAGS: Tag[] = ["VIP", "Corporate", "Frequent"];
const CURRENT_YEAR = new Date().getFullYear();

const schema = z.object({
  full_name: z.string().trim().min(1, "Full name required").max(120),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  date_of_birth: z.string().trim().optional().or(z.literal("")),
  home_address: z.string().trim().max(300).optional().or(z.literal("")),
  billing_address: z.string().trim().max(300).optional().or(z.literal("")),
  shipping_address: z.string().trim().max(300).optional().or(z.literal("")),
  company_name: z.string().trim().max(120).optional().or(z.literal("")),
  preferred_vehicle: z.string().trim().max(80).optional().or(z.literal("")),
  chauffeur_preference: z.string().trim().max(120).optional().or(z.literal("")),
  billing_details: z.string().trim().max(500).optional().or(z.literal("")),
  account_status: z.enum(["active", "inactive", "vip", "suspended"]).default("active"),
  id_type: z.string().trim().max(40).optional().or(z.literal("")),
  id_number: z.string().trim().max(60).optional().or(z.literal("")),
  card_holder_name: z.string().trim().max(120).optional().or(z.literal("")),
  card_brand: z.string().trim().max(20).optional().or(z.literal("")),
  card_last4: z.string().trim().regex(/^\d{4}$/, "Must be 4 digits").optional().or(z.literal("")),
  card_exp_month: z.string().trim().optional().or(z.literal("")),
  card_exp_year: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Customer | null;
  onSaved: () => void;
};

const EMPTY = {
  full_name: "", phone: "", email: "", date_of_birth: "",
  home_address: "", billing_address: "", shipping_address: "",
  company_name: "", preferred_vehicle: "", chauffeur_preference: "",
  billing_details: "", account_status: "active" as "active" | "inactive" | "vip" | "suspended",
  id_type: "", id_number: "",
  card_holder_name: "", card_brand: "", card_last4: "", card_exp_month: "", card_exp_year: "",
  notes: "",
};

export function CustomerForm({ open, onOpenChange, initial, onSaved }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [tags, setTags] = useState<Tag[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const i = initial as (Customer & Record<string, unknown>) | null | undefined;
    setForm({
      full_name: (i?.full_name as string) ?? "",
      phone: (i?.phone as string) ?? "",
      email: (i?.email as string) ?? "",
      date_of_birth: (i?.date_of_birth as string) ?? "",
      home_address: (i?.home_address as string) ?? "",
      billing_address: (i?.billing_address as string) ?? "",
      shipping_address: (i?.shipping_address as string) ?? "",
      company_name: (i?.company_name as string) ?? "",
      preferred_vehicle: (i?.preferred_vehicle as string) ?? "",
      chauffeur_preference: (i?.chauffeur_preference as string) ?? "",
      billing_details: (i?.billing_details as string) ?? "",
      account_status: ((i?.account_status as typeof EMPTY.account_status) ?? "active"),
      id_type: (i?.id_type as string) ?? "",
      id_number: (i?.id_number as string) ?? "",
      card_holder_name: (i?.card_holder_name as string) ?? "",
      card_brand: (i?.card_brand as string) ?? "",
      card_last4: (i?.card_last4 as string) ?? "",
      card_exp_month: i?.card_exp_month ? String(i.card_exp_month) : "",
      card_exp_year: i?.card_exp_year ? String(i.card_exp_year) : "",
      notes: (i?.notes as string) ?? "",
    });
    setTags((i?.tags as Tag[] | null) ?? []);
  }, [open, initial]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    const d = parsed.data;
    const expMonth = d.card_exp_month ? parseInt(d.card_exp_month, 10) : null;
    const expYear = d.card_exp_year ? parseInt(d.card_exp_year, 10) : null;
    if (expMonth !== null && (expMonth < 1 || expMonth > 12)) {
      toast.error("Card expiry month must be 1-12");
      return;
    }
    if (expYear !== null && (expYear < CURRENT_YEAR || expYear > 2100)) {
      toast.error(`Card expiry year must be ${CURRENT_YEAR} or later`);
      return;
    }

    setBusy(true);
    const payload = {
      full_name: d.full_name,
      phone: d.phone || null,
      email: d.email || null,
      date_of_birth: d.date_of_birth || null,
      home_address: d.home_address || null,
      billing_address: d.billing_address || null,
      shipping_address: d.shipping_address || null,
      company_name: d.company_name || null,
      preferred_vehicle: d.preferred_vehicle || null,
      chauffeur_preference: d.chauffeur_preference || null,
      billing_details: d.billing_details || null,
      account_status: d.account_status,
      id_type: d.id_type || null,
      id_number: d.id_number || null,
      card_holder_name: d.card_holder_name || null,
      card_brand: d.card_brand || null,
      card_last4: d.card_last4 || null,
      card_exp_month: expMonth,
      card_exp_year: expYear,
      notes: d.notes || null,
      tags,
    };
    const res = initial
      ? await supabase.from("customers").update(payload).eq("id", initial.id)
      : await supabase.from("customers").insert(payload);
    setBusy(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success(initial ? "Customer updated" : "Customer added");
    onOpenChange(false);
    onSaved();
  };

  const toggleTag = (t: Tag) =>
    setTags((curr) => (curr.includes(t) ? curr.filter((x) => x !== t) : [...curr, t]));

  const copyHomeToBilling = () => setForm((f) => ({ ...f, billing_address: f.home_address }));
  const copyBillingToShipping = () => setForm((f) => ({ ...f, shipping_address: f.billing_address || f.home_address }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl luxury-card max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {initial ? "Edit Customer" : "New Customer"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-8 mt-2">
          {/* Personal */}
          <FormSection title="Personal Details">
            <Field label="Full Name *" className="sm:col-span-2">
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required maxLength={120} />
            </Field>
            <Field label="Date of Birth">
              <Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} max={new Date().toISOString().slice(0, 10)} />
            </Field>
            <Field label="Account Status">
              <select
                value={form.account_status}
                onChange={(e) => setForm({ ...form, account_status: e.target.value as typeof form.account_status })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                <option value="active">Active</option>
                <option value="vip">VIP</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </Field>
          </FormSection>

          {/* Contact */}
          <FormSection title="Contact Information">
            <Field label="Phone Number">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={40} />
            </Field>
            <Field label="Email Address">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} />
            </Field>
            <Field label="Company">
              <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} maxLength={120} />
            </Field>
          </FormSection>

          {/* Addresses */}
          <FormSection title="Address Details">
            <Field label="Home Address" className="sm:col-span-2">
              <Textarea rows={2} value={form.home_address} onChange={(e) => setForm({ ...form, home_address: e.target.value })} maxLength={300} />
            </Field>
            <Field label={<>Billing Address <button type="button" onClick={copyHomeToBilling} className="ml-2 text-[10px] uppercase text-gold hover:underline">Same as home</button></>} className="sm:col-span-2">
              <Textarea rows={2} value={form.billing_address} onChange={(e) => setForm({ ...form, billing_address: e.target.value })} maxLength={300} />
            </Field>
            <Field label={<>Shipping Address <button type="button" onClick={copyBillingToShipping} className="ml-2 text-[10px] uppercase text-gold hover:underline">Same as billing</button></>} className="sm:col-span-2">
              <Textarea rows={2} value={form.shipping_address} onChange={(e) => setForm({ ...form, shipping_address: e.target.value })} maxLength={300} />
            </Field>
          </FormSection>

          {/* Identification */}
          <FormSection title="Identification">
            <Field label="ID Type">
              <select
                value={form.id_type}
                onChange={(e) => setForm({ ...form, id_type: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                <option value="">—</option>
                <option value="Passport">Passport</option>
                <option value="Driver License">Driver License</option>
                <option value="National ID">National ID</option>
                <option value="Corporate Account">Corporate Account</option>
              </select>
            </Field>
            <Field label="ID / Account Number">
              <Input value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })} maxLength={60} />
            </Field>
          </FormSection>

          {/* Service preferences */}
          <FormSection title="Service Preferences">
            <Field label="Preferred Vehicle">
              <Input value={form.preferred_vehicle} onChange={(e) => setForm({ ...form, preferred_vehicle: e.target.value })} placeholder="e.g. Mercedes S-Class" maxLength={80} />
            </Field>
            <Field label="Chauffeur Preferences">
              <Input value={form.chauffeur_preference} onChange={(e) => setForm({ ...form, chauffeur_preference: e.target.value })} placeholder="e.g. Marcus, English speaking" maxLength={120} />
            </Field>
            <Field label="Tags" className="sm:col-span-2">
              <div className="flex gap-2 flex-wrap">
                {ALL_TAGS.map((t) => {
                  const active = tags.includes(t);
                  return (
                    <button key={t} type="button" onClick={() => toggleTag(t)} className="outline-none">
                      <Badge variant="outline" className={active ? "bg-gold-soft text-gold border-gold/40" : "border-border text-muted-foreground"}>
                        {t}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </Field>
          </FormSection>

          {/* Payment */}
          <FormSection title="Payment Information">
            <div className="sm:col-span-2 flex gap-2 items-start text-xs bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-md p-3">
              <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                For PCI compliance, store <b>only</b> non-sensitive card metadata here (brand, last 4 digits, expiry, cardholder name). Never enter the full card number or CVV.
              </div>
            </div>
            <Field label="Cardholder Name">
              <Input value={form.card_holder_name} onChange={(e) => setForm({ ...form, card_holder_name: e.target.value })} maxLength={120} />
            </Field>
            <Field label="Card Brand">
              <select
                value={form.card_brand}
                onChange={(e) => setForm({ ...form, card_brand: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                <option value="">—</option>
                <option>Visa</option>
                <option>Mastercard</option>
                <option>Amex</option>
                <option>Discover</option>
                <option>Other</option>
              </select>
            </Field>
            <Field label="Last 4 Digits">
              <Input value={form.card_last4} onChange={(e) => setForm({ ...form, card_last4: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="1234" inputMode="numeric" maxLength={4} />
            </Field>
            <Field label="Expiry (MM / YYYY)">
              <div className="flex gap-2">
                <Input value={form.card_exp_month} onChange={(e) => setForm({ ...form, card_exp_month: e.target.value.replace(/\D/g, "").slice(0, 2) })} placeholder="MM" inputMode="numeric" maxLength={2} />
                <Input value={form.card_exp_year} onChange={(e) => setForm({ ...form, card_exp_year: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="YYYY" inputMode="numeric" maxLength={4} />
              </div>
            </Field>
            <Field label="Billing Notes / Invoicing Terms" className="sm:col-span-2">
              <Textarea rows={2} value={form.billing_details} onChange={(e) => setForm({ ...form, billing_details: e.target.value })} placeholder="e.g. Net-30 invoice to billing@acme.com" maxLength={500} />
            </Field>
          </FormSection>

          <FormSection title="Additional Notes">
            <Field label="Notes / Special Requests" className="sm:col-span-2">
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={2000} />
            </Field>
          </FormSection>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy} className="gradient-gold text-primary-foreground border-0">
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {initial ? "Save changes" : "Create customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-[10px] uppercase tracking-[0.25em] text-gold border-b border-gold/20 pb-2">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({ label, children, className }: { label: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={"space-y-2 " + (className ?? "")}>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center">{label}</Label>
      {children}
    </div>
  );
}
