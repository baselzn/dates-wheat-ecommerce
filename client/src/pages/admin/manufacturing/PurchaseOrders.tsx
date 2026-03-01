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
import { CheckCircle, Eye, Plus, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type POItem = { rawMaterialId: string; qty: string; unitCost: string };

const STATUS_COLORS: Record<string, string> = {
  draft: "border-gray-400 text-gray-600",
  sent: "border-blue-400 text-blue-700",
  received: "border-green-400 text-green-700 bg-green-50",
  cancelled: "border-red-400 text-red-600",
};

export default function PurchaseOrders() {
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<number | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<POItem[]>([{ rawMaterialId: "", qty: "", unitCost: "" }]);

  const { data: orders = [], isLoading, refetch } = trpc.manufacturing.purchaseOrders.list.useQuery();
  const { data: suppliers = [] } = trpc.manufacturing.suppliers.list.useQuery();
  const { data: rawMaterials = [] } = trpc.manufacturing.rawMaterials.list.useQuery();
  const { data: detail } = trpc.manufacturing.purchaseOrders.getById.useQuery({ id: showDetail! }, { enabled: !!showDetail });

  const createMutation = trpc.manufacturing.purchaseOrders.create.useMutation({
    onSuccess: () => {
      toast.success("Purchase order created");
      setShowCreate(false);
      setSupplierId(""); setExpectedDate(""); setNotes("");
      setItems([{ rawMaterialId: "", qty: "", unitCost: "" }]);
      refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const receiveMutation = trpc.manufacturing.purchaseOrders.receive.useMutation({
    onSuccess: () => { toast.success("Purchase order received — stock updated"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  const addItem = () => setItems(prev => [...prev, { rawMaterialId: "", qty: "", unitCost: "" }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof POItem, val: string) =>
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const handleCreate = () => {
    if (!supplierId) { toast.error("Select a supplier"); return; }
    const validItems = items.filter(i => i.rawMaterialId && i.qty);
    if (validItems.length === 0) { toast.error("Add at least one item"); return; }
    createMutation.mutate({
      supplierId: parseInt(supplierId),
      expectedDate: expectedDate || undefined,
      notes: notes || undefined,
      items: validItems.map(i => ({
        rawMaterialId: parseInt(i.rawMaterialId),
        orderedQty: i.qty,
        unitCost: i.unitCost || "0",
      })),
    });
  };

  const totalAmount = (items: any[]) =>
    items?.reduce((sum: number, i: any) => sum + parseFloat(i.qty || "0") * parseFloat(i.unitCost || "0"), 0) ?? 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" /> Purchase Orders
              </CardTitle>
              <Button onClick={() => setShowCreate(true)} className="bg-[#C9A84C] hover:bg-[#b8943e]">
                <Plus className="h-4 w-4 mr-2" /> New Purchase Order
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Expected Date</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : orders.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No purchase orders yet</TableCell></TableRow>
                  ) : orders.map((o: any) => (
                    <TableRow key={o.id}>
                      <TableCell><code className="text-xs bg-muted px-1 py-0.5 rounded">{o.poNumber}</code></TableCell>
                      <TableCell className="font-medium text-sm">{o.supplierName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{o.expectedDate ? new Date(o.expectedDate).toLocaleDateString() : "—"}</TableCell>
                      <TableCell className="text-right font-mono">AED {parseFloat(o.totalAmount ?? "0").toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_COLORS[o.status] || ""}>{o.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowDetail(o.id)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {(o.status === "draft" || o.status === "sent") && (
                            <Button size="sm" variant="outline" className="h-7 text-xs border-green-400 text-green-700"
                              onClick={() => receiveMutation.mutate({ id: o.id, items: [] })}>
                              <CheckCircle className="h-3 w-3 mr-1" /> Receive
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

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Supplier *</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>
                    {(suppliers as any[]).map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Expected Delivery Date</Label>
                <Input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Items *</Label>
                <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3 w-3 mr-1" /> Add Row</Button>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_90px_90px_auto] gap-2 text-xs text-muted-foreground px-1">
                  <span>Raw Material</span><span>Qty</span><span>Unit Cost</span><span></span>
                </div>
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-[1fr_90px_90px_auto] gap-2 items-center">
                    <Select value={item.rawMaterialId} onValueChange={v => updateItem(i, "rawMaterialId", v)}>
                      <SelectTrigger><SelectValue placeholder="Material" /></SelectTrigger>
                      <SelectContent>
                        {(rawMaterials as any[]).map((m: any) => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="number" placeholder="0" value={item.qty} onChange={e => updateItem(i, "qty", e.target.value)} />
                    <Input type="number" placeholder="0.000" value={item.unitCost} onChange={e => updateItem(i, "unitCost", e.target.value)} />
                    <Button variant="ghost" size="icon" className="text-red-500 h-8 w-8" onClick={() => removeItem(i)} disabled={items.length === 1}>×</Button>
                  </div>
                ))}
              </div>
              <div className="text-right text-sm font-medium mt-2">
                Total: AED {totalAmount(items).toFixed(2)}
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} className="bg-[#C9A84C] hover:bg-[#b8943e]">
              {createMutation.isPending ? "Creating..." : "Create PO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Purchase Order Detail</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">PO #:</span> <code className="text-xs bg-muted px-1 rounded">{(detail as any).orderNumber}</code></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className={STATUS_COLORS[detail.status] || ""}>{detail.status}</Badge></div>
                <div><span className="text-muted-foreground">Supplier:</span> {(detail as any).supplierName}</div>
                <div><span className="text-muted-foreground">Expected:</span> {detail.expectedDate ? new Date(detail.expectedDate).toLocaleDateString() : "—"}</div>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(detail as any).items?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm">{item.rawMaterialName}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{parseFloat(item.qty).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">AED {parseFloat(item.unitCost).toFixed(3)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">AED {parseFloat(item.totalCost).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="text-right font-bold">Total: AED {parseFloat(detail.totalAmount ?? "0").toFixed(2)}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
