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
import { BookOpen, Eye, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type IngredientRow = { rawMaterialId: string; qty: string; unit: string; notes: string };

export default function Recipes() {
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [productId, setProductId] = useState("");
  const [yieldQty, setYieldQty] = useState("1");
  const [yieldUnit, setYieldUnit] = useState("kg");
  const [notes, setNotes] = useState("");
  const [ingredients, setIngredients] = useState<IngredientRow[]>([{ rawMaterialId: "", qty: "", unit: "kg", notes: "" }]);

  const { data: recipes = [], isLoading, refetch } = trpc.manufacturing.recipes.list.useQuery();
  const { data: productsData } = trpc.products.list.useQuery({ limit: 500 });
  const products = productsData?.products ?? [];
  const { data: rawMaterials = [] } = trpc.manufacturing.rawMaterials.list.useQuery();
  const { data: detail } = trpc.manufacturing.recipes.getById.useQuery({ id: showDetail! }, { enabled: !!showDetail });

  const createMutation = trpc.manufacturing.recipes.upsert.useMutation({
    onSuccess: () => {
      toast.success("Recipe created");
      setShowCreate(false);
      setName(""); setProductId(""); setYieldQty("1"); setYieldUnit("kg"); setNotes("");
      setIngredients([{ rawMaterialId: "", qty: "", unit: "kg", notes: "" }]);
      refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addIngredient = () => setIngredients(prev => [...prev, { rawMaterialId: "", qty: "", unit: "kg", notes: "" }]);
  const removeIngredient = (i: number) => setIngredients(prev => prev.filter((_, idx) => idx !== i));
  const updateIngredient = (i: number, field: keyof IngredientRow, val: string) =>
    setIngredients(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const handleCreate = () => {
    if (!name || !productId) { toast.error("Name and product are required"); return; }
    const validIngredients = ingredients.filter(i => i.rawMaterialId && i.qty);
    if (validIngredients.length === 0) { toast.error("Add at least one ingredient"); return; }
    createMutation.mutate({
      name,
      productId: parseInt(productId),
      yieldQty,
      yieldUnit,
      notes: notes || undefined,
      ingredients: validIngredients.map(i => ({
        rawMaterialId: parseInt(i.rawMaterialId),
        qty: i.qty,
        unit: i.unit as "kg" | "g" | "L" | "mL" | "pcs" | "box" | "bag" | "roll",
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
                <BookOpen className="h-5 w-5" /> Recipes / Bill of Materials
              </CardTitle>
              <Button onClick={() => setShowCreate(true)} className="bg-[#C9A84C] hover:bg-[#b8943e]">
                <Plus className="h-4 w-4 mr-2" /> New Recipe
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipe Name</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Yield</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : recipes.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No recipes yet. Create your first recipe to start manufacturing.</TableCell></TableRow>
                  ) : recipes.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.productName}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{parseFloat(r.yieldQty).toFixed(2)} {r.yieldUnit}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={r.isActive ? "border-green-400 text-green-700" : "border-gray-300 text-gray-500"}>
                          {r.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setShowDetail(r.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
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
          <DialogHeader><DialogTitle>New Recipe</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Recipe Name *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Premium Date Box" />
              </div>
              <div>
                <Label>Output Product *</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {(products as any[]).map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.nameEn}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Yield Quantity *</Label>
                <Input type="number" value={yieldQty} onChange={e => setYieldQty(e.target.value)} />
              </div>
              <div>
                <Label>Yield Unit</Label>
                <Select value={yieldUnit} onValueChange={setYieldUnit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["kg", "g", "pcs", "box", "tray", "liter"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Ingredients *</Label>
                <Button variant="outline" size="sm" onClick={addIngredient}><Plus className="h-3 w-3 mr-1" /> Add</Button>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_80px_80px_auto] gap-2 text-xs text-muted-foreground px-1">
                  <span>Raw Material</span><span>Qty</span><span>Unit</span><span></span>
                </div>
                {ingredients.map((ing, i) => (
                  <div key={i} className="grid grid-cols-[1fr_80px_80px_auto] gap-2 items-center">
                    <Select value={ing.rawMaterialId} onValueChange={v => updateIngredient(i, "rawMaterialId", v)}>
                      <SelectTrigger><SelectValue placeholder="Material" /></SelectTrigger>
                      <SelectContent>
                        {(rawMaterials as any[]).map((m: any) => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="number" placeholder="0" value={ing.qty} onChange={e => updateIngredient(i, "qty", e.target.value)} />
                    <Select value={ing.unit} onValueChange={v => updateIngredient(i, "unit", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["kg", "g", "pcs", "liter", "ml", "box"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="text-red-500 h-8 w-8" onClick={() => removeIngredient(i)} disabled={ingredients.length === 1}>×</Button>
                  </div>
                ))}
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
              {createMutation.isPending ? "Creating..." : "Create Recipe"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{detail?.name}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Product:</span> {(detail as any).productName ?? "—"}</div>
                <div><span className="text-muted-foreground">Yield:</span> {parseFloat(detail.yieldQty).toFixed(2)} {detail.yieldUnit}</div>
              </div>
              <div>
                <h4 className="font-medium mb-2 text-sm">Ingredients</h4>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(detail as any).ingredients?.map((ing: any) => (
                        <TableRow key={ing.id}>
                          <TableCell className="text-sm">{ing.rawMaterialName}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{parseFloat(ing.qty).toFixed(3)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{ing.unit}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {ing.costPerUnit ? `AED ${parseFloat(ing.costPerUnit).toFixed(2)}` : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              {detail.notes && <p className="text-sm text-muted-foreground">{detail.notes}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
