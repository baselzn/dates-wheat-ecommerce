import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Edit, MapPin, Plus, Trash2, Warehouse } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type WarehouseForm = {
  id?: number;
  name: string;
  code: string;
  address: string;
  location: string;
  isDefault: boolean;
  isActive: boolean;
};

const emptyForm = (): WarehouseForm => ({
  name: "", code: "", address: "", location: "Dubai, UAE", isDefault: false, isActive: true,
});

export default function Warehouses() {
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<WarehouseForm>(emptyForm());

  const { data: warehouses = [], isLoading, refetch } = trpc.inventory.warehouses.list.useQuery();

  const upsertMutation = trpc.inventory.warehouses.upsert.useMutation({
    onSuccess: () => {
      toast.success(form.id ? "Warehouse updated" : "Warehouse created");
      setShowDialog(false);
      setForm(emptyForm());
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.inventory.warehouses.delete.useMutation({
    onSuccess: () => { toast.success("Warehouse deleted"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = (w: any) => {
    setForm({
      id: w.id, name: w.name, code: w.code ?? "", address: w.address ?? "",
      location: w.location ?? "Dubai, UAE",
      isDefault: w.isDefault ?? false, isActive: w.isActive ?? true,
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!form.name) { toast.error("Name is required"); return; }
    upsertMutation.mutate(form);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Warehouse className="h-5 w-5" /> Warehouses & Locations
              </CardTitle>
              <Button onClick={() => { setForm(emptyForm()); setShowDialog(true); }} className="bg-[#C9A84C] hover:bg-[#b8943e]">
                <Plus className="h-4 w-4 mr-2" /> Add Warehouse
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : warehouses.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No warehouses yet. Add your first one.</TableCell></TableRow>
                  ) : warehouses.map(w => (
                    <TableRow key={w.id}>
                      <TableCell className="font-medium">{w.name}</TableCell>
                      <TableCell><code className="text-xs bg-muted px-1 py-0.5 rounded">{w.code ?? "—"}</code></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {w.location || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {w.isDefault && <Badge className="bg-[#C9A84C] text-white">Default</Badge>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={w.isActive ? "border-green-400 text-green-700" : "border-gray-300 text-gray-500"}>
                          {w.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(w)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700"
                            onClick={() => { if (confirm("Delete this warehouse?")) deleteMutation.mutate({ id: w.id }); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? "Edit Warehouse" : "Add Warehouse"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Main Warehouse" />
              </div>
              <div>
                <Label>Code</Label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="WH-001" />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Street address" />
            </div>
            <div>
              <Label>Location (City, Country)</Label>
              <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Dubai, UAE" />
            </div>
            <div className="flex items-center justify-between">
              <Label>Set as Default Warehouse</Label>
              <Switch checked={form.isDefault} onCheckedChange={v => setForm(f => ({ ...f, isDefault: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={upsertMutation.isPending} className="bg-[#C9A84C] hover:bg-[#b8943e]">
              {upsertMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
