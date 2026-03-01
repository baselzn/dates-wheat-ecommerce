import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Calculator, Edit, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type PMForm = { id?: number; name: string; type: "cash" | "card" | "bank_transfer" | "store_credit" | "other"; isActive: boolean; sortOrder: string };
const emptyForm = (): PMForm => ({ name: "", type: "cash", isActive: true, sortOrder: "0" });

export default function PaymentMethods() {
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<PMForm>(emptyForm());

  const { data: methods = [], isLoading, refetch } = trpc.pos.paymentMethods.list.useQuery();

  const upsertMutation = trpc.pos.paymentMethods.upsert.useMutation({
    onSuccess: () => {
      toast.success(form.id ? "Updated" : "Created");
      setShowDialog(false);
      setForm(emptyForm());
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = (m: any) => {
    setForm({ id: m.id, name: m.name, type: m.type, isActive: m.isActive, sortOrder: String(m.sortOrder ?? 0) });
    setShowDialog(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" /> Payment Methods
              </CardTitle>
              <Button onClick={() => { setForm(emptyForm()); setShowDialog(true); }} className="bg-[#C9A84C] hover:bg-[#b8943e]">
                <Plus className="h-4 w-4 mr-2" /> Add Method
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Sort Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : methods.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No payment methods configured. Add your first one.</TableCell></TableRow>
                  ) : methods.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell><Badge variant="outline">{m.type?.replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell>{m.sortOrder}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={m.isActive ? "border-green-400 text-green-700" : "border-gray-300 text-gray-500"}>
                          {m.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Edit className="h-4 w-4" /></Button>
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
          <DialogHeader><DialogTitle>{form.id ? "Edit" : "Add"} Payment Method</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Cash, Visa, Apple Pay" />
            </div>
            <div>
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["cash", "card", "bank_transfer", "store_credit", "other"].map(t => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sort Order</Label>
              <Input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => upsertMutation.mutate({ ...form, sortOrder: parseInt(form.sortOrder) || 0 })}
              disabled={upsertMutation.isPending} className="bg-[#C9A84C] hover:bg-[#b8943e]">
              {upsertMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
