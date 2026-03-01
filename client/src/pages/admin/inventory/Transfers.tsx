import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Plus, Truck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type TransferItem = { productId: string; qty: string };

const STATUS_COLORS: Record<string, string> = {
  draft: "border-gray-400 text-gray-600",
  in_transit: "border-blue-400 text-blue-700",
  received: "border-green-400 text-green-700",
  cancelled: "border-red-400 text-red-600",
};

export default function Transfers() {
  const [showDialog, setShowDialog] = useState(false);
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<TransferItem[]>([{ productId: "", qty: "" }]);

  const { data: warehouses = [] } = trpc.inventory.warehouses.list.useQuery();
  const { data: transfers = [], isLoading, refetch } = trpc.inventory.transfers.list.useQuery();
  const { data: products = [] } = trpc.products.list.useQuery({ limit: 500 });

  const createMutation = trpc.inventory.transfers.create.useMutation({
    onSuccess: () => {
      toast.success("Transfer created");
      setShowDialog(false);
      setItems([{ productId: "", qty: "" }]);
      setFromWarehouseId(""); setToWarehouseId(""); setNotes("");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const receiveMutation = trpc.inventory.transfers.receive.useMutation({
    onSuccess: () => { toast.success("Transfer received — stock updated"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  const addItem = () => setItems(prev => [...prev, { productId: "", qty: "" }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof TransferItem, val: string) =>
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const handleSubmit = () => {
    if (!fromWarehouseId || !toWarehouseId) { toast.error("Select both warehouses"); return; }
    if (fromWarehouseId === toWarehouseId) { toast.error("From and To warehouses must be different"); return; }
    const validItems = items.filter(i => i.productId && i.qty);
    if (validItems.length === 0) { toast.error("Add at least one item"); return; }
    createMutation.mutate({
      fromWarehouseId: parseInt(fromWarehouseId),
      toWarehouseId: parseInt(toWarehouseId),
      notes: notes || undefined,
      items: validItems.map(i => ({ productId: parseInt(i.productId), qty: i.qty })),
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" /> Stock Transfers
              </CardTitle>
              <Button onClick={() => setShowDialog(true)} className="bg-[#C9A84C] hover:bg-[#b8943e]">
                <Plus className="h-4 w-4 mr-2" /> New Transfer
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : transfers.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No transfers yet</TableCell></TableRow>
                  ) : transfers.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell><code className="text-xs bg-muted px-1 py-0.5 rounded">{t.transferNumber}</code></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">{t.fromWarehouseName}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{t.toWarehouseName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_COLORS[t.status] || ""}>
                          {t.status?.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {(t.status === "draft" || t.status === "in_transit") && (
                            <Button size="sm" variant="outline" className="text-xs h-7 border-green-400 text-green-700"
                              onClick={() => receiveMutation.mutate({ id: t.id })}>
                              Mark Received
                            </Button>
                          )}
                        </div>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Stock Transfer</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>From Warehouse *</Label>
                <Select value={fromWarehouseId} onValueChange={setFromWarehouseId}>
                  <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map(w => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>To Warehouse *</Label>
                <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
                  <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map(w => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Items *</Label>
                <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3 w-3 mr-1" /> Add Row</Button>
              </div>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-[1fr_100px_auto] gap-2 items-center">
                    <Select value={item.productId} onValueChange={v => updateItem(i, "productId", v)}>
                      <SelectTrigger><SelectValue placeholder="Product" /></SelectTrigger>
                      <SelectContent>
                        {(products as any[]).map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.nameEn}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="number" placeholder="Qty" value={item.qty} onChange={e => updateItem(i, "qty", e.target.value)} />
                    <Button variant="ghost" size="icon" className="text-red-500 h-8 w-8" onClick={() => removeItem(i)} disabled={items.length === 1}>×</Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} className="bg-[#C9A84C] hover:bg-[#b8943e]">
              {createMutation.isPending ? "Saving..." : "Create Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
