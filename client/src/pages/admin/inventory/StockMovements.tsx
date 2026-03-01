import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const MOVEMENT_COLORS: Record<string, string> = {
  purchase: "border-green-400 text-green-700 bg-green-50",
  sale: "border-red-400 text-red-700 bg-red-50",
  pos_sale: "border-orange-400 text-orange-700 bg-orange-50",
  adjustment: "border-blue-400 text-blue-700 bg-blue-50",
  transfer_in: "border-teal-400 text-teal-700 bg-teal-50",
  transfer_out: "border-purple-400 text-purple-700 bg-purple-50",
  production_in: "border-emerald-400 text-emerald-700 bg-emerald-50",
  production_out: "border-amber-400 text-amber-700 bg-amber-50",
  return: "border-cyan-400 text-cyan-700 bg-cyan-50",
  opening: "border-gray-400 text-gray-700 bg-gray-50",
};

export default function StockMovements() {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    type: "opening" as const,
    warehouseId: "",
    productId: "",
    qty: "",
    costPerUnit: "",
    notes: "",
  });

  const { data: movements = [], isLoading, refetch } = trpc.inventory.movements.list.useQuery({ limit: 100 });
  const { data: warehouses = [] } = trpc.inventory.warehouses.list.useQuery();
  const { data: productsData } = trpc.products.list.useQuery({ limit: 500 });
  const products = productsData?.products ?? [];

  const createMutation = trpc.inventory.movements.create.useMutation({
    onSuccess: () => {
      toast.success("Stock movement recorded");
      setShowAdd(false);
      setForm({ type: "opening", warehouseId: "", productId: "", qty: "", costPerUnit: "", notes: "" });
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!form.warehouseId || !form.productId || !form.qty) {
      toast.error("Please fill all required fields");
      return;
    }
    createMutation.mutate({
      type: form.type,
      warehouseId: parseInt(form.warehouseId),
      productId: parseInt(form.productId),
      qty: form.qty,
      costPerUnit: form.costPerUnit || undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Stock Movements</CardTitle>
              <Button onClick={() => setShowAdd(true)} className="bg-[#C9A84C] hover:bg-[#b8943e]">
                <Plus className="h-4 w-4 mr-2" /> Record Movement
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Cost/Unit</TableHead>
                    <TableHead>Ref</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : movements.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No movements recorded yet</TableCell></TableRow>
                  ) : movements.map(m => {
                    const qty = parseFloat(m.qty);
                    const isIn = qty > 0;
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(m.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={MOVEMENT_COLORS[m.type] || ""}>
                            {m.type.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{m.productName}</TableCell>
                        <TableCell className="text-sm">{m.warehouseName}</TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={`flex items-center justify-end gap-1 ${isIn ? "text-green-600" : "text-red-600"}`}>
                            {isIn ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                            {Math.abs(qty).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {m.costPerUnit ? `AED ${parseFloat(m.costPerUnit).toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {m.refType ? `${m.refType} #${m.refId}` : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{m.notes || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Movement Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Stock Movement</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["opening", "purchase", "adjustment", "return"].map(t => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Warehouse *</Label>
              <Select value={form.warehouseId} onValueChange={v => setForm(f => ({ ...f, warehouseId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map(w => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Product *</Label>
              <Select value={form.productId} onValueChange={v => setForm(f => ({ ...f, productId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {(products as any[]).map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.nameEn}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quantity * (negative = out)</Label>
                <Input type="number" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} placeholder="e.g. 50 or -10" />
              </div>
              <div>
                <Label>Cost per Unit (AED)</Label>
                <Input type="number" value={form.costPerUnit} onChange={e => setForm(f => ({ ...f, costPerUnit: e.target.value }))} placeholder="0.00" />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} className="bg-[#C9A84C] hover:bg-[#b8943e]">
              {createMutation.isPending ? "Saving..." : "Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
