import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function AdminSettings() {
  const { data: settings } = trpc.admin.settings.get.useQuery();
  const updateSettings = trpc.admin.settings.update.useMutation();

  const [form, setForm] = useState({
    storeName: "Dates & Wheat",
    storeEmail: "admin@datesandwheat.com",
    storePhone: "+971 92237070",
    storeAddress: "Fujairah – Madab – Front KM Trading",
    freeShippingThreshold: "200",
    shippingFee: "25",
    vatRate: "5",
    metaTitle: "Dates & Wheat | Premium Arabic Sweets",
    metaDescription: "Handcrafted Maamoul, Arabic sweets, gluten-free & free-sugar confectionery from Fujairah, UAE.",
  });

  useEffect(() => {
    if (settings) {
      setForm(prev => ({
        ...prev,
        storeName: settings.storeName || prev.storeName,
        storeEmail: settings.storeEmail || prev.storeEmail,
        storePhone: settings.storePhone || prev.storePhone,
        storeAddress: settings.storeAddress || prev.storeAddress,
        freeShippingThreshold: String(settings.freeShippingThreshold || prev.freeShippingThreshold),
        shippingFee: String(settings.shippingFee || prev.shippingFee),
        vatRate: String(settings.vatRate || prev.vatRate),
        metaTitle: settings.metaTitle || prev.metaTitle,
        metaDescription: settings.metaDescription || prev.metaDescription,
      }));
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        storeName: form.storeName,
        storeEmail: form.storeEmail,
        storePhone: form.storePhone,
        storeAddress: form.storeAddress,
        freeShippingThreshold: Number(form.freeShippingThreshold),
        shippingFee: Number(form.shippingFee),
        vatRate: Number(form.vatRate),
        metaTitle: form.metaTitle,
        metaDescription: form.metaDescription,
      });
      toast.success("Settings saved!");
    } catch { toast.error("Failed to save settings"); }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        <h2 className="text-xl font-bold text-[#3E1F00]">Store Settings</h2>

        {/* Store Info */}
        <div className="bg-white rounded-xl border border-[#E8D5A3] p-5">
          <h3 className="font-semibold text-[#3E1F00] mb-4">Store Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Store Name</Label><Input value={form.storeName} onChange={(e) => setForm(p => ({ ...p, storeName: e.target.value }))} className="mt-1 border-[#E8D5A3]" /></div>
            <div><Label>Email</Label><Input value={form.storeEmail} onChange={(e) => setForm(p => ({ ...p, storeEmail: e.target.value }))} className="mt-1 border-[#E8D5A3]" /></div>
            <div><Label>Phone</Label><Input value={form.storePhone} onChange={(e) => setForm(p => ({ ...p, storePhone: e.target.value }))} className="mt-1 border-[#E8D5A3]" /></div>
            <div className="col-span-2"><Label>Address</Label><Input value={form.storeAddress} onChange={(e) => setForm(p => ({ ...p, storeAddress: e.target.value }))} className="mt-1 border-[#E8D5A3]" /></div>
          </div>
        </div>

        {/* Shipping & Tax */}
        <div className="bg-white rounded-xl border border-[#E8D5A3] p-5">
          <h3 className="font-semibold text-[#3E1F00] mb-4">Shipping & Tax</h3>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>Free Shipping Threshold (AED)</Label><Input type="number" value={form.freeShippingThreshold} onChange={(e) => setForm(p => ({ ...p, freeShippingThreshold: e.target.value }))} className="mt-1 border-[#E8D5A3]" /></div>
            <div><Label>Shipping Fee (AED)</Label><Input type="number" value={form.shippingFee} onChange={(e) => setForm(p => ({ ...p, shippingFee: e.target.value }))} className="mt-1 border-[#E8D5A3]" /></div>
            <div><Label>VAT Rate (%)</Label><Input type="number" value={form.vatRate} onChange={(e) => setForm(p => ({ ...p, vatRate: e.target.value }))} className="mt-1 border-[#E8D5A3]" /></div>
          </div>
        </div>

        {/* SEO */}
        <div className="bg-white rounded-xl border border-[#E8D5A3] p-5">
          <h3 className="font-semibold text-[#3E1F00] mb-4">SEO</h3>
          <div className="space-y-3">
            <div><Label>Meta Title</Label><Input value={form.metaTitle} onChange={(e) => setForm(p => ({ ...p, metaTitle: e.target.value }))} className="mt-1 border-[#E8D5A3]" /></div>
            <div><Label>Meta Description</Label><Textarea value={form.metaDescription} onChange={(e) => setForm(p => ({ ...p, metaDescription: e.target.value }))} className="mt-1 border-[#E8D5A3]" rows={3} /></div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={updateSettings.isPending} className="bg-[#C9A84C] hover:bg-[#9A7A2E] text-white">
          {updateSettings.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </AdminLayout>
  );
}
