import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, CreditCard, Banknote, Building2, Smartphone, Receipt, Settings } from "lucide-react";

const PAYMENT_ICONS: Record<string, any> = {
  cash: Banknote,
  card: CreditCard,
  bank_transfer: Building2,
  digital_wallet: Smartphone,
};

export default function POSSettings() {
  const utils = trpc.useUtils();

  // Payment Methods state
  const [showPMDialog, setShowPMDialog] = useState(false);
  const [editingPM, setEditingPM] = useState<any>(null);
  const [pmForm, setPMForm] = useState({ name: "", type: "cash", isActive: true });

  // Receipt Settings state
  const [receiptForm, setReceiptForm] = useState<Record<string, string>>({});
  const [receiptDirty, setReceiptDirty] = useState(false);

  // Queries
  const { data: paymentMethods, refetch: refetchPM } = trpc.pos.paymentMethods.list.useQuery();
  const { data: posSettings } = trpc.pos.settings.getAll.useQuery({
    onSuccess: (data: any) => {
      if (data && !receiptDirty) setReceiptForm(data);
    },
  } as any);

  // Initialize receipt form from settings
  const receiptSettings = posSettings ?? {};

  // Mutations
  const upsertPM = trpc.pos.paymentMethods.upsert.useMutation({
    onSuccess: () => { refetchPM(); setShowPMDialog(false); toast.success(editingPM ? "Payment method updated" : "Payment method created"); },
    onError: (e: any) => toast.error(e.message),
  });
  const deletePM = trpc.pos.paymentMethods.delete.useMutation({
    onSuccess: () => { refetchPM(); toast.success("Payment method deleted"); },
    onError: (e: any) => toast.error(e.message),
  });
  const upsertSetting = trpc.pos.settings.update.useMutation({
    onSuccess: () => {
      utils.pos.settings.getAll.invalidate();
      setReceiptDirty(false);
      toast.success("Settings saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openCreatePM = () => {
    setEditingPM(null);
    setPMForm({ name: "", type: "cash", isActive: true });
    setShowPMDialog(true);
  };

  const openEditPM = (pm: any) => {
    setEditingPM(pm);
    setPMForm({ name: pm.name, type: pm.type, isActive: pm.isActive });
    setShowPMDialog(true);
  };

  const handleSavePM = () => {
    if (!pmForm.name.trim()) { toast.error("Name is required"); return; }
    upsertPM.mutate({
      id: editingPM?.id,
      name: pmForm.name,
      type: pmForm.type as "cash" | "card" | "bank_transfer" | "other" | "store_credit",
      isActive: pmForm.isActive,
    });
  };

  const handleSaveReceiptSetting = (key: string, value: string) => {
    upsertSetting.mutate({ key, value });
  };

  const receiptFields = [
    { key: "receipt_store_name", label: "Store Name", placeholder: "Dates & Wheat" },
    { key: "receipt_store_address", label: "Store Address", placeholder: "Fujairah, UAE" },
    { key: "receipt_store_phone", label: "Store Phone", placeholder: "+971 9 XXX XXXX" },
    { key: "receipt_store_email", label: "Store Email", placeholder: "info@store.com" },
    { key: "receipt_vat_number", label: "VAT Registration Number", placeholder: "100XXXXXXXXX" },
    { key: "receipt_footer_message", label: "Receipt Footer Message", placeholder: "Thank you for your purchase!" },
  ];

  const generalFields = [
    { key: "pos_default_vat_rate", label: "Default VAT Rate (%)", placeholder: "5" },
    { key: "pos_currency", label: "Currency Code", placeholder: "AED" },
    { key: "pos_currency_symbol", label: "Currency Symbol", placeholder: "AED" },
    { key: "pos_receipt_copies", label: "Receipt Copies to Print", placeholder: "1" },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
          <Settings className="w-5 h-5 text-amber-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">POS Settings</h1>
          <p className="text-sm text-gray-500">Configure payment methods, receipt layout, and general POS options</p>
        </div>
      </div>

      <Tabs defaultValue="payment-methods">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="receipt">Receipt</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
        </TabsList>

        {/* ── Payment Methods Tab ── */}
        <TabsContent value="payment-methods" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Configure accepted payment types at the POS terminal</CardDescription>
              </div>
              <Button onClick={openCreatePM} className="bg-amber-700 hover:bg-amber-800 gap-2">
                <Plus className="w-4 h-4" /> Add Method
              </Button>
            </CardHeader>
            <CardContent>
              {!paymentMethods || paymentMethods.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No payment methods yet</p>
                  <p className="text-sm mt-1">Add Cash, Card, or Bank Transfer to get started</p>
                  <Button onClick={openCreatePM} variant="outline" className="mt-4 gap-2">
                    <Plus className="w-4 h-4" /> Add First Method
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {(paymentMethods as any[]).map((pm: any) => {
                    const Icon = PAYMENT_ICONS[pm.type] ?? CreditCard;
                    return (
                      <div key={pm.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pm.isActive ? "bg-amber-100" : "bg-gray-100"}`}>
                          <Icon className={`w-5 h-5 ${pm.isActive ? "text-amber-700" : "text-gray-400"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{pm.name}</p>
                            <Badge variant="outline" className="text-xs capitalize">{pm.type.replace("_", " ")}</Badge>
                            {!pm.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                          </div>
                          {pm.accountCode && (
                            <p className="text-xs text-gray-500 mt-0.5">Account: {pm.accountCode}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={pm.isActive}
                            onCheckedChange={(checked) => upsertPM.mutate({ id: pm.id, name: pm.name, type: pm.type, isActive: checked })}
                          />
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditPM(pm)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => { if (confirm("Delete this payment method?")) deletePM.mutate({ id: pm.id }); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Receipt Tab ── */}
        <TabsContent value="receipt" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Receipt className="w-5 h-5" /> Receipt Configuration</CardTitle>
              <CardDescription>Customize what appears on printed and digital receipts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {receiptFields.map(field => (
                <div key={field.key} className="grid grid-cols-3 gap-4 items-center">
                  <Label className="text-sm font-medium text-gray-700">{field.label}</Label>
                  <div className="col-span-2 flex gap-2">
                    <Input
                      defaultValue={(receiptSettings as any)[field.key] ?? ""}
                      placeholder={field.placeholder}
                      id={`receipt-${field.key}`}
                      className="flex-1"
                    />
                    <Button variant="outline" size="sm"
                      onClick={() => {
                        const el = document.getElementById(`receipt-${field.key}`) as HTMLInputElement;
                        handleSaveReceiptSetting(field.key, el?.value ?? "");
                      }}>
                      Save
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── General Tab ── */}
        <TabsContent value="general" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>VAT rates, currency, and operational defaults</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {generalFields.map(field => (
                <div key={field.key} className="grid grid-cols-3 gap-4 items-center">
                  <Label className="text-sm font-medium text-gray-700">{field.label}</Label>
                  <div className="col-span-2 flex gap-2">
                    <Input
                      defaultValue={(receiptSettings as any)[field.key] ?? ""}
                      placeholder={field.placeholder}
                      id={`general-${field.key}`}
                      className="flex-1"
                    />
                    <Button variant="outline" size="sm"
                      onClick={() => {
                        const el = document.getElementById(`general-${field.key}`) as HTMLInputElement;
                        handleSaveReceiptSetting(field.key, el?.value ?? "");
                      }}>
                      Save
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Method Dialog */}
      <Dialog open={showPMDialog} onOpenChange={setShowPMDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingPM ? "Edit Payment Method" : "Add Payment Method"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name</Label>
              <Input value={pmForm.name} onChange={e => setPMForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Cash, Visa Card, Bank Transfer" className="mt-1" autoFocus />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={pmForm.type} onValueChange={v => setPMForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card (Visa / Mastercard)</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="digital_wallet">Digital Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={pmForm.isActive} onCheckedChange={v => setPMForm(f => ({ ...f, isActive: v }))} />
              <Label>Active (visible at checkout)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPMDialog(false)}>Cancel</Button>
            <Button className="bg-amber-700 hover:bg-amber-800" onClick={handleSavePM}
              disabled={upsertPM.isPending}>
              {editingPM ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
