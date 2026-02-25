import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type CatForm = { id?: number; nameEn: string; nameAr: string; slug: string; description: string; isActive: boolean; sortOrder: string };
const EMPTY: CatForm = { nameEn: "", nameAr: "", slug: "", description: "", isActive: true, sortOrder: "0" };

export default function AdminCategories() {
  const [form, setForm] = useState<CatForm>(EMPTY);
  const [open, setOpen] = useState(false);
  const { data: categories, refetch } = trpc.categories.list.useQuery();
  const upsert = trpc.admin.categories.upsert.useMutation();
  const del = trpc.admin.categories.delete.useMutation();

  const handleSave = async () => {
    if (!form.nameEn) { toast.error("Name is required"); return; }
    try {
      const slug = form.slug || form.nameEn.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      await upsert.mutateAsync({ ...form, slug, sortOrder: Number(form.sortOrder) || 0 });
      toast.success("Category saved!");
      setOpen(false);
      refetch();
    } catch { toast.error("Failed to save"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this category?")) return;
    try { await del.mutateAsync(id); toast.success("Deleted"); refetch(); }
    catch { toast.error("Failed to delete"); }
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#3E1F00]">Categories</h2>
          <Button onClick={() => { setForm(EMPTY); setOpen(true); }} className="bg-[#C9A84C] hover:bg-[#9A7A2E] text-white">
            <Plus className="h-4 w-4 mr-2" /> Add Category
          </Button>
        </div>
        <div className="bg-white rounded-xl border border-[#E8D5A3] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F5ECD7]">
              <tr>
                <th className="text-left px-4 py-3 text-[#3E1F00] font-semibold">Name</th>
                <th className="text-left px-4 py-3 text-[#3E1F00] font-semibold">Slug</th>
                <th className="text-center px-4 py-3 text-[#3E1F00] font-semibold">Status</th>
                <th className="text-right px-4 py-3 text-[#3E1F00] font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories?.map((cat) => (
                <tr key={cat.id} className="border-t border-[#E8D5A3] hover:bg-[#F5ECD7]/30">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#3E1F00]">{cat.nameEn}</p>
                    <p className="text-xs text-[#C9A84C] font-arabic" dir="rtl">{cat.nameAr}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{cat.slug}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${cat.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {cat.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                      setForm({ id: cat.id, nameEn: cat.nameEn, nameAr: cat.nameAr || "", slug: cat.slug, description: cat.description || "", isActive: cat.isActive !== false, sortOrder: String(cat.sortOrder || 0) });
                      setOpen(true);
                    }}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(cat.id)}>
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
            <DialogHeader><DialogTitle>{form.id ? "Edit" : "Add"} Category</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div><Label>Name (EN) *</Label><Input value={form.nameEn} onChange={(e) => setForm(p => ({ ...p, nameEn: e.target.value }))} className="mt-1 border-[#E8D5A3]" /></div>
              <div><Label>Name (AR)</Label><Input value={form.nameAr} onChange={(e) => setForm(p => ({ ...p, nameAr: e.target.value }))} className="mt-1 border-[#E8D5A3]" dir="rtl" /></div>
              <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm(p => ({ ...p, slug: e.target.value }))} className="mt-1 border-[#E8D5A3]" placeholder="auto" /></div>
              <div><Label>Sort Order</Label><Input type="number" value={form.sortOrder} onChange={(e) => setForm(p => ({ ...p, sortOrder: e.target.value }))} className="mt-1 border-[#E8D5A3]" /></div>
              <div className="col-span-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} className="mt-1 border-[#E8D5A3]" /></div>
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
