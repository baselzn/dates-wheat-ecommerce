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
import { ClipboardList, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type AdjItem = { productId: string; expectedQty: string; actualQty: string; notes: string };
type Reason = "cycle_count" | "damage" | "expiry" | "theft" | "found" | "opening_stock" | "other";

const REASONS: Reason[] = ["cycle_count", "damage", "expiry", "theft", "found", "opening_stock", "other"];

export default function Adjustments() {
  const [showDialog, setShowDialog] = useState(false);
  const [warehouseId, setWarehouseId] = useState("");
  const [reason, setReason] = useState<Reason>("cycle_count");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<AdjItem[]>([{ productId: "", expectedQty: "", actualQty: "", notes: "" }]);

  const { data: warehouses = [] } = trpc.inventory.warehouses.list.useQuery();
  const { data: adjustments = [], isLoading, refetch } = trpc.inventory.adjustments.list.useQuery();
  const { data: productsData } = trpc.products.list.useQuery({ limit: 500 });
  const products = productsData?.products ?? [];

  const createMutation = trpc.inventory.adjustments.create.useMutation({
    onSuccess: () => {
      toast.success("Adjustment created");
      setShowDialog(false);
      setItems([{ productId: "", expectedQty: "", actualQty: "", notes: "" }]);
      setWarehouseId(""); setNotes(""); setReason("cycle_count");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const addItem = () => setItems(prev => [...prev, { productId: "", expectedQty: "", actualQty: "", notes: "" }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof AdjItem, val: string) =>
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const handleSubmit = () => {
    if (!warehouseId) { toast.error("Select a warehouse"); return; }
    const validItems = items.filter(i => i.productId && i.actualQty);
    if (validItems.length === 0) { toast.error("Add at least one item with actual qty"); return; }
    createMutation.mutate({
      warehouseId: parseInt(warehouseId),
      reason,
      notes: notes || undefined,
      items: validItems.map(i => ({
        productId: parseInt(i.productId),
        expectedQty: i.expectedQty || "0",
        actualQty: i.actualQty,
        notes: i.notes || undefined,
      })),
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" /> Stock Adjustments
              </CardTitle>
              <Button onClick={() => setShowDialog(true)} className="bg-[#C9A84C] hover:bg-[#b8943e]">
                <Plus className="h-4 w-4 mr-2" /> New Adjustment
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : adjustments.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No adjustments yet</TableCell></TableRow>
                  ) : adjustments.map((adj: any) => (
                    <TableRow key={adj.id}>
                      <TableCell className="text-sm text-muted-foreground">{new Date(adj.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{adj.warehouseName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{adj.reason?.replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={adj.status === "approved" ? "border-green-400 text-green-700" : "border-amber-400 text-amber-700"}>
                          {adj.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{adj.notes || "—"}</TableCell>
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
          <DialogHeader><DialogTitle>New Stock Adjustment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Warehouse *</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map(w => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reason *</Label>
                <Select value={reason} onValueChange={v => setReason(v as Reason)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REASONS.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}
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
                <div className="grid grid-cols-[1fr_90px_90px_auto] gap-2 text-xs text-muted-foreground px-1">
                  <span>Product</span><span>Expected</span><span>Actual</span><span></span>
                </div>
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-[1fr_90px_90px_auto] gap-2 items-center">
                    <Select value={item.productId} onValueChange={v => updateItem(i, "productId", v)}>
                      <SelectTrigger><SelectValue placeholder="Product" /></SelectTrigger>
                      <SelectContent>
                        {(products as any[]).map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.nameEn}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="number" placeholder="0" value={item.expectedQty} onChange={e => updateItem(i, "expectedQty", e.target.value)} />
                    <Input type="number" placeholder="0" value={item.actualQty} onChange={e => updateItem(i, "actualQty", e.target.value)} />
                    <Button variant="ghost" size="icon" className="text-red-500 h-8 w-8" onClick={() => removeItem(i)} disabled={items.length === 1}>×</Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reason for adjustment..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} className="bg-[#C9A84C] hover:bg-[#b8943e]">
              {createMutation.isPending ? "Saving..." : "Create Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
