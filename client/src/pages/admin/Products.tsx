import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Download, Edit, Plus, Search, Star, Trash2, Upload, X } from "lucide-react";
import { exportToCsv } from "@/lib/csvExport";
import { useState } from "react";
import { toast } from "sonner";

type ProductForm = {
  nameEn: string; nameAr: string; slug: string;
  descriptionEn: string; descriptionAr: string;
  categoryId: string; basePrice: string; comparePrice: string;
  stockQty: string; isGlutenFree: boolean; isSugarFree: boolean;
  isVegan: boolean; isActive: boolean; isFeatured: boolean;
};

const EMPTY_FORM: ProductForm = {
  nameEn: "", nameAr: "", slug: "", descriptionEn: "", descriptionAr: "",
  categoryId: "", basePrice: "", comparePrice: "", stockQty: "100",
  isGlutenFree: false, isSugarFree: false, isVegan: false, isActive: true, isFeatured: false,
};

type GalleryImage = { id: number; url: string; isFeatured: boolean; altText?: string | null };

export default function AdminProducts() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editProduct, setEditProduct] = useState<ProductForm & { id?: number }>(EMPTY_FORM);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);

  const { data, isLoading, refetch } = trpc.admin.products.list.useQuery({ search, page, limit: 20 });
  const { data: categories } = trpc.categories.list.useQuery();
  const upsertProduct = trpc.admin.products.upsert.useMutation();
  const deleteProduct = trpc.admin.products.delete.useMutation();
  const addImage = trpc.admin.products.addImage.useMutation();
  const deleteImage = trpc.admin.products.deleteImage.useMutation();
  const setFeaturedImage = trpc.admin.products.setFeaturedImage.useMutation();

  const utils = trpc.useUtils();

  const handleOpen = async (product?: Record<string, unknown> & {
    id?: number; nameEn?: string; nameAr?: string; slug?: string;
    descriptionEn?: string; descriptionAr?: string; categoryId?: number;
    basePrice?: string | number; comparePrice?: string | number | null;
    stockQty?: number; isGlutenFree?: boolean; isSugarFree?: boolean;
    isVegan?: boolean; isActive?: boolean; isFeatured?: boolean;
  }) => {
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
      });
      // Load existing gallery images
      if (product.id) {
        const imgs = await utils.client.admin.products.getImages.query(product.id as number);
        setGallery(imgs as GalleryImage[]);
      } else {
        setGallery([]);
      }
    } else {
      setEditProduct(EMPTY_FORM);
      setGallery([]);
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
      // Sync featured image URL to the product's main images field
      const featuredImg = gallery.find(g => g.isFeatured);
      const imageUrls = gallery.map(g => g.url);
      if (featuredImg) {
        // Move featured to front
        const sorted = [featuredImg.url, ...imageUrls.filter(u => u !== featuredImg.url)];
        imageUrls.splice(0, imageUrls.length, ...sorted);
      }
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
        images: imageUrls,
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
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const reader = new FileReader();
        await new Promise<void>((resolve, reject) => {
          reader.onload = async () => {
            try {
              const base64 = (reader.result as string).split(",")[1];
              const isFirst = gallery.length === 0;
              if (editProduct.id) {
                // Product already saved — persist to product_images table
                const result = await addImage.mutateAsync({
                  productId: editProduct.id,
                  base64,
                  filename: file.name,
                  mimeType: file.type,
                  isFeatured: isFirst,
                });
                setGallery(prev => [...prev, { id: result.id, url: result.url, isFeatured: isFirst }]);
              } else {
                // New product — stage locally until saved
                const tempId = Date.now() + Math.random();
                // Upload to S3 via uploadImage (no productId needed yet)
                const resp = await utils.client.admin.products.uploadImage.mutate({ base64, filename: file.name, mimeType: file.type });
                setGallery(prev => [...prev, { id: tempId, url: resp.url, isFeatured: isFirst && prev.length === 0 }]);
              }
              resolve();
            } catch (err) { reject(err); }
          };
          reader.readAsDataURL(file);
        });
      }
      toast.success(`${files.length} image${files.length > 1 ? "s" : ""} uploaded`);
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteImage = async (img: GalleryImage) => {
    if (editProduct.id && img.id > 1000000) {
      // Temp staged image — just remove from local state
      setGallery(prev => prev.filter(g => g.id !== img.id));
      return;
    }
    try {
      if (editProduct.id) await deleteImage.mutateAsync(img.id);
      const newGallery = gallery.filter(g => g.id !== img.id);
      // If we deleted the featured, promote the first remaining
      if (img.isFeatured && newGallery.length > 0) {
        newGallery[0].isFeatured = true;
        if (editProduct.id) await setFeaturedImage.mutateAsync({ productId: editProduct.id, imageId: newGallery[0].id });
      }
      setGallery(newGallery);
    } catch {
      toast.error("Failed to delete image");
    }
  };

  const handleSetFeatured = async (img: GalleryImage) => {
    const updated = gallery.map(g => ({ ...g, isFeatured: g.id === img.id }));
    setGallery(updated);
    if (editProduct.id) {
      try {
        await setFeaturedImage.mutateAsync({ productId: editProduct.id, imageId: img.id });
        toast.success("Featured image updated");
      } catch {
        toast.error("Failed to set featured image");
      }
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!data?.products?.length) return;
                exportToCsv(
                  `products-${new Date().toISOString().slice(0, 10)}.csv`,
                  ["ID", "Name (EN)", "Name (AR)", "SKU", "Category ID", "Price (AED)", "Stock", "Active", "Featured"],
                  data.products.map((p) => [
                    p.id,
                    p.nameEn,
                    p.nameAr ?? "",
                    p.sku ?? "",
                    p.categoryId ?? "",
                    Number(p.basePrice).toFixed(2),
                    p.stockQty ?? 0,
                    p.isActive ? "Yes" : "No",
                    p.isFeatured ? "Yes" : "No",
                  ])
                );
              }}
              className="border-[#C9A84C] text-[#C9A84C] hover:bg-[#F5ECD7]"
            >
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
            <Button onClick={() => handleOpen()} className="bg-[#C9A84C] hover:bg-[#9A7A2E] text-white">
              <Plus className="h-4 w-4 mr-2" /> Add Product
            </Button>
          </div>
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
                    <td className="px-4 py-3 text-muted-foreground">{(product as unknown as Record<string, unknown>).categoryName as string || "—"}</td>
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

              {/* ── Multi-Image Gallery ── */}
              <div className="col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <Label>Product Images</Label>
                  <span className="text-xs text-muted-foreground">Click ★ to set featured image</span>
                </div>

                {/* Gallery grid */}
                {gallery.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {gallery.map((img) => (
                      <div key={img.id} className="relative group rounded-lg overflow-hidden border-2 aspect-square"
                        style={{ borderColor: img.isFeatured ? "#C9A84C" : "#E8D5A3" }}>
                        <img src={img.url} alt={img.altText || "product"} className="w-full h-full object-cover" />
                        {/* Featured badge */}
                        {img.isFeatured && (
                          <div className="absolute top-1 left-1 bg-[#C9A84C] text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <Star className="h-2.5 w-2.5 fill-white" /> Featured
                          </div>
                        )}
                        {/* Hover actions */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                          {!img.isFeatured && (
                            <button
                              onClick={() => handleSetFeatured(img)}
                              className="bg-[#C9A84C] text-white rounded-full p-1 hover:bg-[#9A7A2E] transition-colors"
                              title="Set as featured"
                            >
                              <Star className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteImage(img)}
                            className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                            title="Delete image"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload button */}
                <label className="cursor-pointer block">
                  <div className="flex items-center justify-center gap-2 w-full h-14 border-2 border-dashed border-[#C9A84C] rounded-lg hover:bg-[#F5ECD7] transition-colors">
                    {uploading ? (
                      <div className="animate-spin w-5 h-5 border-2 border-[#C9A84C] border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <Upload className="h-4 w-4 text-[#C9A84C]" />
                        <span className="text-sm text-[#C9A84C] font-medium">
                          {gallery.length === 0 ? "Upload images" : "Add more images"}
                        </span>
                        <span className="text-xs text-muted-foreground">(multiple allowed)</span>
                      </>
                    )}
                  </div>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                </label>
              </div>

              {/* Toggles */}
              <div className="col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { key: "isActive", label: "Active" },
                  { key: "isFeatured", label: "Featured Product" },
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
