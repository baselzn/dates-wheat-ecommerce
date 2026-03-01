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
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Edit, Package, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Unit = "kg" | "g" | "L" | "mL" | "pcs" | "box" | "bag" | "roll";
const UNITS: Unit[] = ["kg", "g", "L", "mL", "pcs", "box", "bag", "roll"];

type RMForm = {
  id?: number; name: string; sku: string; unit: Unit;
  costPerUnit: string; minStockQty: string; notes: string; isActive: boolean;
};
const emptyForm = (): RMForm => ({ name: "", sku: "", unit: "kg", costPerUnit: "", minStockQty: "0", notes: "", isActive: true });

export default function RawMaterials() {
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<RMForm>(emptyForm());

  const { data: materials = [], isLoading, refetch } = trpc.manufacturing.rawMaterials.list.useQuery();
  const { data: suppliers = [] } = trpc.manufacturing.suppliers.list.useQuery();

  const upsertMutation = trpc.manufacturing.rawMaterials.upsert.useMutation({
    onSuccess: () => {
      toast.success(form.id ? "Updated" : "Created");
      setShowDialog(false);
      setForm(emptyForm());
      refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (m: any) => {
    setForm({
      id: m.id, name: m.name, sku: m.sku || "", unit: m.unit,
      costPerUnit: m.costPerUnit || "", minStockQty: m.minStockQty || "0",
      notes: m.notes || "", isActive: m.isActive,
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
                <Package className="h-5 w-5" /> Raw Materials
              </CardTitle>
              <Button onClick={() => { setForm(emptyForm()); setShowDialog(true); }} className="bg-[#C9A84C] hover:bg-[#b8943e]">
                <Plus className="h-4 w-4 mr-2" /> Add Material
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Cost/Unit</TableHead>
                    <TableHead className="text-right">Min Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : materials.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No raw materials yet. Add your first material to start creating recipes.</TableCell></TableRow>
                  ) : materials.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">{m.sku || "—"}</TableCell>
                      <TableCell><Badge variant="outline">{m.unit}</Badge></TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {m.costPerUnit ? `AED ${parseFloat(m.costPerUnit).toFixed(3)}` : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{parseFloat(m.minStockQty ?? "0").toFixed(2)}</TableCell>
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
          <DialogHeader><DialogTitle>{form.id ? "Edit" : "Add"} Raw Material</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Medjool Dates" />
              </div>
              <div>
                <Label>SKU</Label>
                <Input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="Optional" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Unit *</Label>
                <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v as Unit }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cost per Unit (AED)</Label>
                <Input type="number" value={form.costPerUnit} onChange={e => setForm(f => ({ ...f, costPerUnit: e.target.value }))} placeholder="0.000" />
              </div>
            </div>
            <div>
              <Label>Minimum Stock Quantity</Label>
              <Input type="number" value={form.minStockQty} onChange={e => setForm(f => ({ ...f, minStockQty: e.target.value }))} />
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
                code: form.sku || undefined,
                unit: form.unit,
                costPerUnit: form.costPerUnit || undefined,
                stockQty: form.minStockQty || "0",
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
