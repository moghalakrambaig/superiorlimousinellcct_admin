import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, FileDown, FileText, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CustomerForm } from "@/components/shared/CustomerForm";
import { downloadCsv, exportPdf } from "@/lib/csv";
import { formatDate } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Database } from "@/integrations/supabase/types";

type Customer = Database["public"]["Tables"]["customers"]["Row"];

const PAGE_SIZE = 10;

export const Route = createFileRoute("/_web/_authenticated/customers/")({
  component: CustomersPage,
});

function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [confirmDel, setConfirmDel] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setCustomers(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return customers.filter((c) => {
      if (tagFilter !== "all" && !(c.tags ?? []).includes(tagFilter as never)) return false;
      if (!needle) return true;
      return [c.full_name, c.email, c.phone, c.company_name].some((v) =>
        (v ?? "").toString().toLowerCase().includes(needle),
      );
    });
  }, [customers, q, tagFilter]);

  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => { setPage(0); }, [q, tagFilter]);

  const handleDelete = async () => {
    if (!confirmDel) return;
    const { error } = await supabase.from("customers").delete().eq("id", confirmDel.id);
    if (error) toast.error(error.message);
    else toast.success("Customer deleted");
    setConfirmDel(null);
    load();
  };

  const exportRows = filtered.map((c) => ({
    Name: c.full_name, Email: c.email ?? "", Phone: c.phone ?? "",
    Company: c.company_name ?? "", Vehicle: c.preferred_vehicle ?? "",
    Tags: (c.tags ?? []).join(", "), Created: formatDate(c.created_at),
  }));

  return (
    <div className="p-4 md:p-10 space-y-4 md:space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">Clients</div>
          <h1 className="text-3xl md:text-4xl font-display">Customers</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => downloadCsv("customers.csv", exportRows)}>
            <FileDown className="h-4 w-4 mr-2" /> CSV
          </Button>
          <Button variant="outline" onClick={() => exportPdf("Customers", exportRows)}>
            <FileText className="h-4 w-4 mr-2" /> PDF
          </Button>
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="gradient-gold text-primary-foreground border-0">
            <Plus className="h-4 w-4 mr-2" /> New Customer
          </Button>
        </div>
      </div>

      <div className="luxury-card rounded-xl p-4 flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-0 md:min-w-[240px] w-full">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, phone, email, or company…"
            className="pl-10"
          />
        </div>
        <div className="flex gap-1 flex-wrap overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
          {["all", "VIP", "Corporate", "Frequent"].map((t) => (
            <button
              key={t}
              onClick={() => setTagFilter(t)}
              className={
                "px-3 py-1.5 text-xs rounded-md border transition-colors " +
                (tagFilter === t
                  ? "bg-gold-soft text-gold border-gold/40"
                  : "border-border text-muted-foreground hover:text-foreground")
              }
            >{t}</button>
          ))}
        </div>
      </div>

      <div className="luxury-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30">
              <tr>
                <th className="text-left px-6 py-3">Name</th>
                <th className="text-left px-6 py-3">Contact</th>
                <th className="text-left px-6 py-3">Company</th>
                <th className="text-left px-6 py-3">Tags</th>
                <th className="text-right px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {!loading && pageRows.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-16 text-center text-muted-foreground">
                  No customers found. Try a different search or add one.
                </td></tr>
              )}
              {pageRows.map((c) => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="px-6 py-3">
                    <Link to="/customers/$id" params={{ id: c.id }} className="font-medium hover:text-gold transition-colors">
                      {c.full_name}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">
                    <div>{c.email ?? "—"}</div>
                    <div className="text-xs">{c.phone ?? ""}</div>
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">{c.company_name ?? "—"}</td>
                  <td className="px-6 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {(c.tags ?? []).map((t) => (
                        <Badge key={t} variant="outline" className="bg-gold-soft text-gold border-gold/40">{t}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setConfirmDel(c)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-6 py-3 border-t border-border text-sm text-muted-foreground">
          <div>{filtered.length} customer{filtered.length === 1 ? "" : "s"}</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</Button>
            <span>Page {page + 1} / {pageCount}</span>
            <Button variant="outline" size="sm" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </div>

      <CustomerForm open={open} onOpenChange={setOpen} initial={editing} onSaved={load} />

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <b>{confirmDel?.full_name}</b> and all their bookings &amp; notes.
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
