import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Building2, Edit, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type SupplierForm = {
  id?: number; name: string; contactName: string; email: string;
  phone: string; address: string; notes: string; isActive: boolean;
};
const emptyForm = (): SupplierForm => ({ name: "", contactName: "", email: "", phone: "", address: "", notes: "", isActive: true });

export default function Suppliers() {
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<SupplierForm>(emptyForm());

  const { data: suppliers = [], isLoading, refetch } = trpc.manufacturing.suppliers.list.useQuery();

  const upsertMutation = trpc.manufacturing.suppliers.upsert.useMutation({
    onSuccess: () => {
      toast.success(form.id ? "Supplier updated" : "Supplier created");
      setShowDialog(false);
      setForm(emptyForm());
      refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (s: any) => {
    setForm({
      id: s.id, name: s.name, contactName: s.contactName || "",
      email: s.email || "", phone: s.phone || "",
      address: s.address || "", notes: s.notes || "", isActive: s.isActive,
    });
    setShowDialog(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" /> Suppliers
              </CardTitle>
              <Button onClick={() => { setForm(emptyForm()); setShowDialog(true); }} className="bg-[#C9A84C] hover:bg-[#b8943e]">
                <Plus className="h-4 w-4 mr-2" /> Add Supplier
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : suppliers.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No suppliers yet. Add your first supplier to manage purchase orders.</TableCell></TableRow>
                  ) : suppliers.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.contactName || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.email || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.phone || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={s.isActive ? "border-green-400 text-green-700" : "border-gray-300 text-gray-500"}>
                          {s.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Edit className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? "Edit" : "Add"} Supplier</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Company Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Al Baraka Dates Co." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Contact Name</Label>
                <Input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <Label>Address</Label>
              <Textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={2} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button
              onClick={() => upsertMutation.mutate({
                id: form.id,
                name: form.name,
                contactName: form.contactName || undefined,
                email: form.email || undefined,
                phone: form.phone || undefined,
                address: form.address || undefined,
                notes: form.notes || undefined,
                isActive: form.isActive,
              })}
              disabled={upsertMutation.isPending}
              className="bg-[#C9A84C] hover:bg-[#b8943e]"
            >
              {upsertMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
