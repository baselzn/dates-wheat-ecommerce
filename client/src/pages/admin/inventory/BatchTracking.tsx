import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, AlertTriangle, Calendar, Package } from "lucide-react";

function getDaysUntilExpiry(expiryDate: string | null) {
  if (!expiryDate) return null;
  const diff = new Date(expiryDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function ExpiryBadge({ expiryDate }: { expiryDate: string | null }) {
  if (!expiryDate) return <span className="text-muted-foreground text-sm">—</span>;
  const days = getDaysUntilExpiry(expiryDate);
  if (days === null) return null;
  if (days < 0) return <Badge variant="destructive">Expired {Math.abs(days)}d ago</Badge>;
  if (days <= 7) return <Badge variant="destructive">{days}d left</Badge>;
  if (days <= 30) return <Badge className="bg-orange-500 text-white">{days}d left</Badge>;
  if (days <= 90) return <Badge className="bg-yellow-500 text-white">{days}d left</Badge>;
  return <Badge variant="outline" className="text-green-600">{days}d left</Badge>;
}

export default function BatchTracking() {
  const [search, setSearch] = useState("");
  const [showExpiring, setShowExpiring] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    productId: "",
    warehouseId: "",
    batchNumber: "",
    lotNumber: "",
    expiryDate: "",
    manufactureDate: "",
    quantity: "",
    costPerUnit: "",
    notes: "",
  });

  const { data: batches, refetch } = trpc.inventory.batches.list.useQuery({
    search: search || undefined,
    expiringWithinDays: showExpiring ? 30 : undefined,
  });
  const { data: productsData } = trpc.admin.products.list.useQuery({ limit: 200 });
  const { data: warehouses } = trpc.inventory.warehouses.list.useQuery();

  const addBatch = trpc.inventory.batches.create.useMutation({
    onSuccess: () => {
      toast.success("Batch added");
      setAddOpen(false);
      setForm({ productId: "", warehouseId: "", batchNumber: "", lotNumber: "", expiryDate: "", manufactureDate: "", quantity: "", costPerUnit: "", notes: "" });
      void refetch();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const deactivateBatch = trpc.inventory.batches.deactivate.useMutation({
    onSuccess: () => { toast.success("Batch deactivated"); void refetch(); },
  });

  const handleSubmit = () => {
    if (!form.productId || !form.warehouseId || !form.batchNumber || !form.quantity) {
      toast.error("Required fields missing");
      return;
    }
    addBatch.mutate({
      productId: parseInt(form.productId),
      warehouseId: parseInt(form.warehouseId),
      batchNumber: form.batchNumber,
      lotNumber: form.lotNumber || undefined,
      expiryDate: form.expiryDate || undefined,
      manufactureDate: form.manufactureDate || undefined,
      quantity: form.quantity,
      costPerUnit: form.costPerUnit || undefined,
      notes: form.notes || undefined,
    });
  };

  const expiringCount = (batches ?? []).filter((b: any) => {
    const days = getDaysUntilExpiry(b.expiryDate);
    return days !== null && days <= 30 && days >= 0;
  }).length;

  const expiredCount = (batches ?? []).filter((b: any) => {
    const days = getDaysUntilExpiry(b.expiryDate);
    return days !== null && days < 0;
  }).length;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Batch & Lot Tracking</h1>
            <p className="text-muted-foreground text-sm">Track inventory batches with expiry dates</p>
          </div>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Batch
          </Button>
        </div>

        {/* Alert Banner */}
        {(expiringCount > 0 || expiredCount > 0) && (
          <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
                <div className="text-sm">
                  {expiredCount > 0 && (
                    <span className="font-semibold text-red-600 mr-3">{expiredCount} expired batch{expiredCount > 1 ? "es" : ""}</span>
                  )}
                  {expiringCount > 0 && (
                    <span className="font-semibold text-orange-600">{expiringCount} batch{expiringCount > 1 ? "es" : ""} expiring within 30 days</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex gap-3 items-center">
          <Input
            placeholder="Search batch, lot, or product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Button
            variant={showExpiring ? "default" : "outline"}
            size="sm"
            onClick={() => setShowExpiring(!showExpiring)}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Expiring Soon
          </Button>
        </div>

        {/* Batch Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Product</th>
                    <th className="text-left px-4 py-3 font-medium">Batch #</th>
                    <th className="text-left px-4 py-3 font-medium">Lot #</th>
                    <th className="text-left px-4 py-3 font-medium">Warehouse</th>
                    <th className="text-right px-4 py-3 font-medium">Qty</th>
                    <th className="text-left px-4 py-3 font-medium">Mfg Date</th>
                    <th className="text-left px-4 py-3 font-medium">Expiry</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {(batches ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-muted-foreground">
                        <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        No batches found
                      </td>
                    </tr>
                  ) : (
                    (batches ?? []).map((b: any) => (
                      <tr key={b.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{b.productNameEn}</td>
                        <td className="px-4 py-3 font-mono text-xs">{b.batchNumber}</td>
                        <td className="px-4 py-3 text-muted-foreground">{b.lotNumber ?? "—"}</td>
                        <td className="px-4 py-3">{b.warehouseName}</td>
                        <td className="px-4 py-3 text-right font-medium">{parseFloat(b.quantity).toFixed(2)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{b.manufactureDate ?? "—"}</td>
                        <td className="px-4 py-3">
                          <ExpiryBadge expiryDate={b.expiryDate} />
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={b.isActive ? "default" : "secondary"}>
                            {b.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {b.isActive && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => deactivateBatch.mutate({ id: b.id })}
                            >
                              Deactivate
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Add Batch Dialog */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Batch</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="col-span-2 space-y-1">
                <Label>Product *</Label>
                <Select value={form.productId} onValueChange={(v) => setForm({ ...form, productId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {(productsData?.products ?? []).map((p: any) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.nameEn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Warehouse *</Label>
                <Select value={form.warehouseId} onValueChange={(v) => setForm({ ...form, warehouseId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                  <SelectContent>
                    {(warehouses ?? []).map((w: any) => (
                      <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Quantity *</Label>
                <Input type="number" min="0" step="0.001" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Batch Number *</Label>
                <Input value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} placeholder="e.g. BATCH-2026-001" />
              </div>
              <div className="space-y-1">
                <Label>Lot Number</Label>
                <Input value={form.lotNumber} onChange={(e) => setForm({ ...form, lotNumber: e.target.value })} placeholder="Optional" />
              </div>
              <div className="space-y-1">
                <Label>Manufacture Date</Label>
                <Input type="date" value={form.manufactureDate} onChange={(e) => setForm({ ...form, manufactureDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Expiry Date</Label>
                <Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Cost per Unit (AED)</Label>
                <Input type="number" min="0" step="0.0001" value={form.costPerUnit} onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={addBatch.isPending}>
                {addBatch.isPending ? "Adding..." : "Add Batch"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
