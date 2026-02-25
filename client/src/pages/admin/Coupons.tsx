import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type CouponForm = { id?: number; code: string; type: "percentage" | "fixed"; value: string; minOrderAmount: string; maxUses: string; isActive: boolean; expiresAt: string };
const EMPTY: CouponForm = { code: "", type: "percentage", value: "", minOrderAmount: "", maxUses: "", isActive: true, expiresAt: "" };

export default function AdminCoupons() {
  const [form, setForm] = useState<CouponForm>(EMPTY);
  const [open, setOpen] = useState(false);
  const { data: coupons, refetch } = trpc.admin.coupons.list.useQuery();
  const upsert = trpc.admin.coupons.upsert.useMutation();
  const del = trpc.admin.coupons.delete.useMutation();

  const handleSave = async () => {
    if (!form.code || !form.value) { toast.error("Code and value are required"); return; }
    try {
      await upsert.mutateAsync({
        ...form,
        code: form.code.toUpperCase(),
        value: Number(form.value),
        minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : undefined,
        maxUses: form.maxUses ? Number(form.maxUses) : undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt) : undefined,
      });
      toast.success("Coupon saved!");
      setOpen(false);
      refetch();
    } catch { toast.error("Failed to save coupon"); }
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#3E1F00]">Coupons</h2>
          <Button onClick={() => { setForm(EMPTY); setOpen(true); }} className="bg-[#C9A84C] hover:bg-[#9A7A2E] text-white">
            <Plus className="h-4 w-4 mr-2" /> Add Coupon
          </Button>
        </div>
        <div className="bg-white rounded-xl border border-[#E8D5A3] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F5ECD7]">
              <tr>
                <th className="text-left px-4 py-3 text-[#3E1F00] font-semibold">Code</th>
                <th className="text-left px-4 py-3 text-[#3E1F00] font-semibold">Type</th>
                <th className="text-right px-4 py-3 text-[#3E1F00] font-semibold">Value</th>
                <th className="text-right px-4 py-3 text-[#3E1F00] font-semibold">Uses</th>
                <th className="text-center px-4 py-3 text-[#3E1F00] font-semibold">Status</th>
                <th className="text-right px-4 py-3 text-[#3E1F00] font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons?.map((c) => (
                <tr key={c.id} className="border-t border-[#E8D5A3] hover:bg-[#F5ECD7]/30">
                  <td className="px-4 py-3 font-mono font-bold text-[#3E1F00]">{c.code}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{c.type}</td>
                  <td className="px-4 py-3 text-right font-medium text-[#3E1F00]">
                    {c.type === "percentage" ? `${c.value}%` : `AED ${Number(c.value).toFixed(2)}`}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{c.usedCount || 0}{c.maxUses ? `/${c.maxUses}` : ""}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={c.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
                      {c.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                      setForm({ id: c.id, code: c.code, type: c.type as "percentage" | "fixed", value: String(c.value), minOrderAmount: String(c.minOrderAmount || ""), maxUses: String(c.maxUses || ""), isActive: c.isActive !== false, expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString().split("T")[0] : "" });
                      setOpen(true);
                    }}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={async () => {
                      if (!confirm("Delete?")) return;
                      await del.mutateAsync(c.id); refetch(); toast.success("Deleted");
                    }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? "Edit" : "Add"} Coupon</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div><Label>Code *</Label><Input value={form.code} onChange={(e) => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} className="mt-1 border-[#E8D5A3] font-mono" /></div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm(p => ({ ...p, type: v as "percentage" | "fixed" }))}>
                  <SelectTrigger className="mt-1 border-[#E8D5A3]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed (AED)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Value *</Label><Input type="number" value={form.value} onChange={(e) => setForm(p => ({ ...p, value: e.target.value }))} className="mt-1 border-[#E8D5A3]" /></div>
              <div><Label>Min Order (AED)</Label><Input type="number" value={form.minOrderAmount} onChange={(e) => setForm(p => ({ ...p, minOrderAmount: e.target.value }))} className="mt-1 border-[#E8D5A3]" /></div>
              <div><Label>Max Uses</Label><Input type="number" value={form.maxUses} onChange={(e) => setForm(p => ({ ...p, maxUses: e.target.value }))} className="mt-1 border-[#E8D5A3]" /></div>
              <div><Label>Expires At</Label><Input type="date" value={form.expiresAt} onChange={(e) => setForm(p => ({ ...p, expiresAt: e.target.value }))} className="mt-1 border-[#E8D5A3]" /></div>
              <div className="flex items-center gap-2"><Switch checked={form.isActive} onCheckedChange={(v) => setForm(p => ({ ...p, isActive: v }))} /><Label>Active</Label></div>
            </div>
            <div className="flex gap-3 mt-4">
              <Button onClick={handleSave} disabled={upsert.isPending} className="flex-1 bg-[#C9A84C] hover:bg-[#9A7A2E] text-white">Save</Button>
              <Button variant="outline" onClick={() => setOpen(false)} className="border-[#C9A84C] text-[#C9A84C]">Cancel</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
