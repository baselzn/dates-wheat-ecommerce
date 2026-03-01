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
import { Eye, Factory, Play, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  draft: "border-gray-400 text-gray-600",
  in_progress: "border-blue-400 text-blue-700 bg-blue-50",
  completed: "border-green-400 text-green-700 bg-green-50",
  cancelled: "border-red-400 text-red-600",
};

export default function Production() {
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<number | null>(null);
  const [form, setForm] = useState({ recipeId: "", productId: "", plannedQty: "", batchNumber: "", scheduledDate: "", notes: "" });

  const { data: orders = [], isLoading, refetch } = trpc.manufacturing.production.list.useQuery();
  const { data: recipes = [] } = trpc.manufacturing.recipes.list.useQuery();
  const { data: products = [] } = trpc.products.list.useQuery({ limit: 500 });
  const { data: detail } = trpc.manufacturing.production.getById.useQuery({ id: showDetail! }, { enabled: !!showDetail });

  const createMutation = trpc.manufacturing.production.create.useMutation({
    onSuccess: () => {
      toast.success("Production order created");
      setShowCreate(false);
      setForm({ recipeId: "", productId: "", plannedQty: "", batchNumber: "", scheduledDate: "", notes: "" });
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStatusMutation = trpc.manufacturing.production.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status updated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const handleCreate = () => {
    if (!form.recipeId || !form.productId || !form.plannedQty) {
      toast.error("Recipe, product, and planned quantity are required");
      return;
    }
    createMutation.mutate({
      recipeId: parseInt(form.recipeId),
      productId: parseInt(form.productId),
      plannedQty: form.plannedQty,
      batchNumber: form.batchNumber || undefined,
      scheduledDate: form.scheduledDate || undefined,
      notes: form.notes || undefined,
    });
  };

  // Auto-fill product from recipe selection
  const handleRecipeChange = (recipeId: string) => {
    const recipe = (recipes as any[]).find(r => String(r.id) === recipeId);
    setForm(f => ({ ...f, recipeId, productId: recipe?.productId ? String(recipe.productId) : f.productId }));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Factory className="h-5 w-5" /> Production Orders
              </CardTitle>
              <Button onClick={() => setShowCreate(true)} className="bg-[#C9A84C] hover:bg-[#b8943e]">
                <Plus className="h-4 w-4 mr-2" /> New Production Order
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Recipe</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead className="text-right">Planned Qty</TableHead>
                    <TableHead className="text-right">Actual Qty</TableHead>
                    <TableHead className="text-right">Cost/Unit</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : orders.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No production orders yet</TableCell></TableRow>
                  ) : orders.map((o: any) => (
                    <TableRow key={o.id}>
                      <TableCell><code className="text-xs bg-muted px-1 py-0.5 rounded">{o.orderNumber}</code></TableCell>
                      <TableCell className="font-medium text-sm">{o.productName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{o.recipeName}</TableCell>
                      <TableCell className="text-sm">{o.batchNumber || "—"}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{parseFloat(o.plannedQty).toFixed(0)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{o.actualQty ? parseFloat(o.actualQty).toFixed(0) : "—"}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{o.costPerUnit ? `AED ${parseFloat(o.costPerUnit).toFixed(2)}` : "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{o.scheduledDate ? new Date(o.scheduledDate).toLocaleDateString() : "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_COLORS[o.status] || ""}>{o.status?.replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowDetail(o.id)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {o.status === "draft" && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600"
                              onClick={() => updateStatusMutation.mutate({ id: o.id, status: "in_progress" })}>
                              <Play className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {o.status === "in_progress" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs border-green-400 text-green-700"
                              onClick={() => updateStatusMutation.mutate({ id: o.id, status: "completed", actualQty: o.plannedQty })}>
                              Complete
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
        <DialogContent>
          <DialogHeader><DialogTitle>New Production Order</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Recipe *</Label>
              <Select value={form.recipeId} onValueChange={handleRecipeChange}>
                <SelectTrigger><SelectValue placeholder="Select recipe" /></SelectTrigger>
                <SelectContent>
                  {(recipes as any[]).map((r: any) => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
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
                <Label>Planned Quantity *</Label>
                <Input type="number" value={form.plannedQty} onChange={e => setForm(f => ({ ...f, plannedQty: e.target.value }))} placeholder="e.g. 100" />
              </div>
              <div>
                <Label>Batch Number</Label>
                <Input value={form.batchNumber} onChange={e => setForm(f => ({ ...f, batchNumber: e.target.value }))} placeholder="Optional" />
              </div>
            </div>
            <div>
              <Label>Scheduled Date</Label>
              <Input type="date" value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} className="bg-[#C9A84C] hover:bg-[#b8943e]">
              {createMutation.isPending ? "Creating..." : "Create Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Production Order Detail</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div><span className="text-muted-foreground">Order #:</span> <code className="text-xs bg-muted px-1 rounded">{detail.orderNumber}</code></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className={STATUS_COLORS[detail.status] || ""}>{detail.status}</Badge></div>
                <div><span className="text-muted-foreground">Planned:</span> {parseFloat(detail.plannedQty).toFixed(0)} units</div>
                {detail.totalCost && <div><span className="text-muted-foreground">Total Cost:</span> AED {parseFloat(detail.totalCost).toFixed(2)}</div>}
                {detail.costPerUnit && <div><span className="text-muted-foreground">Cost/Unit:</span> AED {parseFloat(detail.costPerUnit).toFixed(2)}</div>}
              </div>
              <div>
                <h4 className="font-medium mb-2 text-sm">Bill of Materials</h4>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead className="text-right">Planned Qty</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead className="text-right">Cost/Unit</TableHead>
                        <TableHead className="text-right">Total Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(detail as any).ingredients?.map((ing: any) => (
                        <TableRow key={ing.id}>
                          <TableCell className="text-sm">{ing.rawMaterialName}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{parseFloat(ing.plannedQty).toFixed(3)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{ing.unit}</TableCell>
                          <TableCell className="text-right font-mono text-sm">AED {parseFloat(ing.costPerUnit ?? "0").toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">AED {parseFloat(ing.totalCost ?? "0").toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
