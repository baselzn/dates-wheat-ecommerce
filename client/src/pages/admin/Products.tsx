import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Edit, Plus, Search, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ProductForm = {
  nameEn: string; nameAr: string; slug: string;
  descriptionEn: string; descriptionAr: string;
  categoryId: string; basePrice: string; comparePrice: string;
  stockQty: string; isGlutenFree: boolean; isSugarFree: boolean;
  isVegan: boolean; isActive: boolean; isFeatured: boolean;
  images: string;
};

const EMPTY_FORM: ProductForm = {
  nameEn: "", nameAr: "", slug: "", descriptionEn: "", descriptionAr: "",
  categoryId: "", basePrice: "", comparePrice: "", stockQty: "100",
  isGlutenFree: false, isSugarFree: false, isVegan: false, isActive: true, isFeatured: false,
  images: "",
};

export default function AdminProducts() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editProduct, setEditProduct] = useState<ProductForm & { id?: number }>(EMPTY_FORM);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data, isLoading, refetch } = trpc.admin.products.list.useQuery({ search, page, limit: 20 });
  const { data: categories } = trpc.categories.list.useQuery();
  const upsertProduct = trpc.admin.products.upsert.useMutation();
  const deleteProduct = trpc.admin.products.delete.useMutation();
  const uploadImage = trpc.admin.products.uploadImage.useMutation();

  const handleOpen = (product?: Record<string, unknown> & { id?: number; nameEn?: string; nameAr?: string; slug?: string; descriptionEn?: string; descriptionAr?: string; categoryId?: number; basePrice?: string | number; comparePrice?: string | number | null; stockQty?: number; isGlutenFree?: boolean; isSugarFree?: boolean; isVegan?: boolean; isActive?: boolean; isFeatured?: boolean; images?: string[]; categoryName?: string }) => {
    if (product) {
      setEditProduct({
        id: product.id,
        nameEn: product.nameEn || "",
        nameAr: product.nameAr || "",
        slug: product.slug || "",
        descriptionEn: product.descriptionEn || "",
        descriptionAr: product.descriptionAr || "",
        categoryId: String(product.categoryId || ""),
        basePrice: String(product.basePrice || ""),
        comparePrice: String(product.comparePrice || ""),
        stockQty: String(product.stockQty || 0),
        isGlutenFree: product.isGlutenFree || false,
        isSugarFree: product.isSugarFree || false,
        isVegan: product.isVegan || false,
        isActive: product.isActive !== false,
        isFeatured: product.isFeatured || false,
        images: (product.images || []).join("\n"),
      });
    } else {
      setEditProduct(EMPTY_FORM);
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editProduct.nameEn || !editProduct.basePrice) {
      toast.error("Name and price are required");
      return;
    }
    try {
      const slug = editProduct.slug || editProduct.nameEn.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      await upsertProduct.mutateAsync({
        id: editProduct.id,
        nameEn: editProduct.nameEn,
        nameAr: editProduct.nameAr || undefined,
        slug,
        descriptionEn: editProduct.descriptionEn || undefined,
        descriptionAr: editProduct.descriptionAr || undefined,
        categoryId: editProduct.categoryId ? Number(editProduct.categoryId) : undefined,
        basePrice: Number(editProduct.basePrice),
        comparePrice: editProduct.comparePrice ? Number(editProduct.comparePrice) : undefined,
        stockQty: Number(editProduct.stockQty) || 0,
        isGlutenFree: editProduct.isGlutenFree,
        isSugarFree: editProduct.isSugarFree,
        isVegan: editProduct.isVegan,
        isActive: editProduct.isActive,
        isFeatured: editProduct.isFeatured,
        images: editProduct.images ? editProduct.images.split("\n").filter(Boolean) : [],
      });
      toast.success(editProduct.id ? "Product updated!" : "Product created!");
      setDialogOpen(false);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save product";
      toast.error(msg);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this product?")) return;
    try {
      await deleteProduct.mutateAsync(id);
      toast.success("Product deleted");
      refetch();
    } catch {
      toast.error("Failed to delete product");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const result = await uploadImage.mutateAsync({ base64, filename: file.name, mimeType: file.type });
        setEditProduct(prev => ({
          ...prev,
          images: prev.images ? `${prev.images}\n${result.url}` : result.url,
        }));
        toast.success("Image uploaded!");
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#3E1F00]">Products</h2>
            <p className="text-sm text-muted-foreground">{data?.total || 0} total products</p>
          </div>
          <Button onClick={() => handleOpen()} className="bg-[#C9A84C] hover:bg-[#9A7A2E] text-white">
            <Plus className="h-4 w-4 mr-2" /> Add Product
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search products..."
            className="pl-9 border-[#E8D5A3] bg-white"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-[#E8D5A3] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F5ECD7]">
                <tr>
                  <th className="text-left px-4 py-3 text-[#3E1F00] font-semibold">Product</th>
                  <th className="text-left px-4 py-3 text-[#3E1F00] font-semibold">Category</th>
                  <th className="text-right px-4 py-3 text-[#3E1F00] font-semibold">Price</th>
                  <th className="text-right px-4 py-3 text-[#3E1F00] font-semibold">Stock</th>
                  <th className="text-center px-4 py-3 text-[#3E1F00] font-semibold">Status</th>
                  <th className="text-right px-4 py-3 text-[#3E1F00] font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : data?.products.map((product) => (
                  <tr key={product.id} className="border-t border-[#E8D5A3] hover:bg-[#F5ECD7]/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#F5ECD7] overflow-hidden shrink-0">
                          {product.images?.[0] ? (
                            <img src={product.images[0]} alt={product.nameEn} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg">🍬</div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-[#3E1F00]">{product.nameEn}</p>
                          <p className="text-xs text-[#C9A84C] font-arabic" dir="rtl">{product.nameAr}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{product.categoryName || "—"}</td>
                    <td className="px-4 py-3 text-right font-medium text-[#3E1F00]">
                      AED {Number(product.basePrice).toFixed(2)}
                      {product.comparePrice && (
                        <p className="text-xs text-muted-foreground line-through">AED {Number(product.comparePrice).toFixed(2)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${(product.stockQty || 0) <= 5 ? "text-red-500" : "text-[#3E1F00]"}`}>
                        {product.stockQty || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={product.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
                        {product.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpen(product as Record<string, unknown> & { id?: number })}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(product.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoading && data?.products.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No products found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Product Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[#3E1F00]">{editProduct.id ? "Edit Product" : "Add Product"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <Label>Name (English) *</Label>
                <Input value={editProduct.nameEn} onChange={(e) => setEditProduct(p => ({ ...p, nameEn: e.target.value }))} className="mt-1 border-[#E8D5A3]" />
              </div>
              <div>
                <Label>Name (Arabic)</Label>
                <Input value={editProduct.nameAr} onChange={(e) => setEditProduct(p => ({ ...p, nameAr: e.target.value }))} className="mt-1 border-[#E8D5A3]" dir="rtl" />
              </div>
              <div>
                <Label>Slug (URL)</Label>
                <Input value={editProduct.slug} onChange={(e) => setEditProduct(p => ({ ...p, slug: e.target.value }))} className="mt-1 border-[#E8D5A3]" placeholder="auto-generated" />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={editProduct.categoryId} onValueChange={(v) => setEditProduct(p => ({ ...p, categoryId: v }))}>
                  <SelectTrigger className="mt-1 border-[#E8D5A3]">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.nameEn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Base Price (AED) *</Label>
                <Input type="number" value={editProduct.basePrice} onChange={(e) => setEditProduct(p => ({ ...p, basePrice: e.target.value }))} className="mt-1 border-[#E8D5A3]" />
              </div>
              <div>
                <Label>Compare Price (AED)</Label>
                <Input type="number" value={editProduct.comparePrice} onChange={(e) => setEditProduct(p => ({ ...p, comparePrice: e.target.value }))} className="mt-1 border-[#E8D5A3]" />
              </div>
              <div>
                <Label>Stock Quantity</Label>
                <Input type="number" value={editProduct.stockQty} onChange={(e) => setEditProduct(p => ({ ...p, stockQty: e.target.value }))} className="mt-1 border-[#E8D5A3]" />
              </div>
              <div className="col-span-2">
                <Label>Description (English)</Label>
                <Textarea value={editProduct.descriptionEn} onChange={(e) => setEditProduct(p => ({ ...p, descriptionEn: e.target.value }))} className="mt-1 border-[#E8D5A3]" rows={3} />
              </div>
              <div className="col-span-2">
                <Label>Description (Arabic)</Label>
                <Textarea value={editProduct.descriptionAr} onChange={(e) => setEditProduct(p => ({ ...p, descriptionAr: e.target.value }))} className="mt-1 border-[#E8D5A3]" rows={2} dir="rtl" />
              </div>

              {/* Image upload */}
              <div className="col-span-2">
                <Label>Images</Label>
                <div className="mt-1 flex gap-2">
                  <Textarea
                    value={editProduct.images}
                    onChange={(e) => setEditProduct(p => ({ ...p, images: e.target.value }))}
                    className="border-[#E8D5A3] text-xs"
                    rows={2}
                    placeholder="One image URL per line"
                  />
                  <div>
                    <label className="cursor-pointer">
                      <div className="flex flex-col items-center justify-center w-20 h-20 border-2 border-dashed border-[#C9A84C] rounded-lg hover:bg-[#F5ECD7] transition-colors">
                        {uploading ? (
                          <div className="animate-spin w-5 h-5 border-2 border-[#C9A84C] border-t-transparent rounded-full" />
                        ) : (
                          <>
                            <Upload className="h-5 w-5 text-[#C9A84C]" />
                            <span className="text-xs text-[#C9A84C] mt-1">Upload</span>
                          </>
                        )}
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { key: "isActive", label: "Active" },
                  { key: "isFeatured", label: "Featured" },
                  { key: "isGlutenFree", label: "Gluten Free" },
                  { key: "isSugarFree", label: "Sugar Free" },
                  { key: "isVegan", label: "Vegan" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <Switch
                      checked={editProduct[key as keyof ProductForm] as boolean}
                      onCheckedChange={(v) => setEditProduct(p => ({ ...p, [key]: v }))}
                    />
                    <Label className="cursor-pointer">{label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <Button onClick={handleSave} disabled={upsertProduct.isPending} className="flex-1 bg-[#C9A84C] hover:bg-[#9A7A2E] text-white">
                {upsertProduct.isPending ? "Saving..." : "Save Product"}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-[#C9A84C] text-[#C9A84C]">
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
