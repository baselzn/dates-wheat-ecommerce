import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Edit, Gift, Percent, Plus, ShoppingBag, Tag, Trash2, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const RULE_TYPES = [
  { value: "cart_total", label: "Cart Total Discount", icon: ShoppingBag, description: "Discount based on cart subtotal" },
  { value: "quantity_tier", label: "Quantity Tier Discount", icon: Tag, description: "Discount based on total quantity" },
  { value: "bogo", label: "Buy X Get Y (BOGO)", icon: Gift, description: "Buy X items, get Y free" },
  { value: "category_discount", label: "Category Discount", icon: Percent, description: "Discount on specific category" },
  { value: "product_discount", label: "Product Discount", icon: Zap, description: "Discount on specific product" },
  { value: "first_order", label: "First Order Discount", icon: Gift, description: "Discount for first-time customers" },
  { value: "free_shipping", label: "Free Shipping", icon: ShoppingBag, description: "Free shipping above a threshold" },
];

type RuleType = "cart_total" | "bogo" | "quantity_tier" | "category_discount" | "product_discount" | "user_role" | "first_order" | "free_shipping";

interface RuleForm {
  id?: number;
  name: string;
  description: string;
  type: RuleType;
  isActive: boolean;
  priority: number;
  usageLimit: string;
  conditions: string;
  actions: string;
}

const DEFAULT_CONDITIONS: Record<RuleType, object> = {
  cart_total: { minAmount: 100 },
  quantity_tier: { tiers: [{ minQty: 3, discountPct: 5 }, { minQty: 5, discountPct: 10 }] },
  bogo: { buyQty: 2, getQty: 1, productId: null },
  category_discount: { categoryId: null },
  product_discount: { productId: null },
  user_role: { role: "vip" },
  first_order: {},
  free_shipping: { minAmount: 200 },
};

const DEFAULT_ACTIONS: Record<RuleType, object> = {
  cart_total: { discountType: "percentage", discountValue: 10, maxDiscount: null },
  quantity_tier: {},
  bogo: {},
  category_discount: { discountType: "percentage", discountValue: 15 },
  product_discount: { discountType: "percentage", discountValue: 20 },
  user_role: { discountType: "percentage", discountValue: 10 },
  first_order: { discountType: "percentage", discountValue: 10 },
  free_shipping: { shippingDiscount: 25 },
};

function getDefaultForm(): RuleForm {
  return {
    name: "",
    description: "",
    type: "cart_total",
    isActive: true,
    priority: 0,
    usageLimit: "",
    conditions: JSON.stringify(DEFAULT_CONDITIONS.cart_total, null, 2),
    actions: JSON.stringify(DEFAULT_ACTIONS.cart_total, null, 2),
  };
}

export default function DiscountRules() {
  const { data: rules = [], refetch } = trpc.discountRules.list.useQuery();
  const upsertMutation = trpc.discountRules.upsert.useMutation({
    onSuccess: () => { toast.success("Rule saved"); refetch(); setOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.discountRules.delete.useMutation({
    onSuccess: () => { toast.success("Rule deleted"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<RuleForm>(getDefaultForm());
  const [condError, setCondError] = useState("");
  const [actError, setActError] = useState("");

  function openNew() {
    setForm(getDefaultForm());
    setCondError(""); setActError("");
    setOpen(true);
  }

  function openEdit(rule: typeof rules[0]) {
    setForm({
      id: rule.id,
      name: rule.name,
      description: rule.description ?? "",
      type: rule.type as RuleType,
      isActive: rule.isActive,
      priority: rule.priority,
      usageLimit: rule.usageLimit ? String(rule.usageLimit) : "",
      conditions: rule.conditions,
      actions: rule.actions,
    });
    setCondError(""); setActError("");
    setOpen(true);
  }

  function handleTypeChange(type: RuleType) {
    setForm(f => ({
      ...f,
      type,
      conditions: JSON.stringify(DEFAULT_CONDITIONS[type], null, 2),
      actions: JSON.stringify(DEFAULT_ACTIONS[type], null, 2),
    }));
  }

  function validateJson(str: string, setter: (e: string) => void): boolean {
    try { JSON.parse(str); setter(""); return true; }
    catch (e: unknown) { setter(e instanceof Error ? e.message : "Invalid JSON"); return false; }
  }

  function handleSave() {
    const c = validateJson(form.conditions, setCondError);
    const a = validateJson(form.actions, setActError);
    if (!c || !a) return;
    upsertMutation.mutate({
      ...form,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
    });
  }

  const ruleTypeInfo = (type: string) => RULE_TYPES.find(r => r.value === type);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#3E1F00]">Discount Rules</h2>
            <p className="text-sm text-[#3E1F00]/60 mt-1">
              Advanced pricing rules: BOGO, quantity tiers, cart discounts, and more
            </p>
          </div>
          <Button onClick={openNew} className="bg-[#C9A84C] hover:bg-[#B8963E] text-white">
            <Plus className="h-4 w-4 mr-2" /> New Rule
          </Button>
        </div>

        {/* Rule Type Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {RULE_TYPES.slice(0, 4).map(rt => {
            const Icon = rt.icon;
            const count = rules.filter(r => r.type === rt.value).length;
            return (
              <Card key={rt.value} className="border-[#E8D5A3] bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-4 w-4 text-[#C9A84C]" />
                    <span className="text-xs font-medium text-[#3E1F00]">{rt.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-[#3E1F00]">{count}</p>
                  <p className="text-xs text-[#3E1F00]/50">rules</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Rules List */}
        {rules.length === 0 ? (
          <Card className="border-[#E8D5A3] border-dashed">
            <CardContent className="py-16 text-center">
              <Gift className="h-12 w-12 text-[#C9A84C]/40 mx-auto mb-3" />
              <p className="text-[#3E1F00]/60 font-medium">No discount rules yet</p>
              <p className="text-sm text-[#3E1F00]/40 mt-1">Create rules to automatically apply discounts to customer orders</p>
              <Button onClick={openNew} variant="outline" className="mt-4 border-[#C9A84C] text-[#C9A84C]">
                <Plus className="h-4 w-4 mr-2" /> Create First Rule
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {rules.map(rule => {
              const typeInfo = ruleTypeInfo(rule.type);
              const Icon = typeInfo?.icon ?? Tag;
              return (
                <Card key={rule.id} className="border-[#E8D5A3] bg-white hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${rule.isActive ? "bg-[#C9A84C]/10" : "bg-gray-100"}`}>
                          <Icon className={`h-5 w-5 ${rule.isActive ? "text-[#C9A84C]" : "text-gray-400"}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-[#3E1F00] truncate">{rule.name}</span>
                            <Badge variant={rule.isActive ? "default" : "secondary"}
                              className={rule.isActive ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-500"}>
                              {rule.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <Badge variant="outline" className="border-[#E8D5A3] text-[#C9A84C] text-xs">
                              {typeInfo?.label ?? rule.type}
                            </Badge>
                          </div>
                          {rule.description && (
                            <p className="text-sm text-[#3E1F00]/60 truncate mt-0.5">{rule.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-[#3E1F00]/40">
                            <span>Priority: {rule.priority}</span>
                            {rule.usageLimit && <span>Limit: {rule.usedCount}/{rule.usageLimit}</span>}
                            {rule.startsAt && <span>From: {new Date(rule.startsAt).toLocaleDateString()}</span>}
                            {rule.endsAt && <span>Until: {new Date(rule.endsAt).toLocaleDateString()}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(rule)}
                          className="text-[#3E1F00]/60 hover:text-[#3E1F00]">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm"
                          onClick={() => { if (confirm("Delete this rule?")) deleteMutation.mutate(rule.id); }}
                          className="text-red-400 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Rule Builder Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[#3E1F00]">
                {form.id ? "Edit Discount Rule" : "Create Discount Rule"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 pt-2">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Rule Name *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g., Summer 10% Off" className="mt-1" />
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Optional description for admin reference" className="mt-1" />
                </div>
              </div>

              {/* Rule Type */}
              <div>
                <Label>Rule Type *</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {RULE_TYPES.map(rt => {
                    const Icon = rt.icon;
                    return (
                      <button key={rt.value} type="button"
                        onClick={() => handleTypeChange(rt.value as RuleType)}
                        className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-colors ${
                          form.type === rt.value
                            ? "border-[#C9A84C] bg-[#C9A84C]/10 text-[#3E1F00]"
                            : "border-gray-200 hover:border-[#C9A84C]/50 text-gray-600"
                        }`}>
                        <Icon className="h-4 w-4 shrink-0" />
                        <div>
                          <p className="text-xs font-medium">{rt.label}</p>
                          <p className="text-[10px] text-gray-500">{rt.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Settings Row */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Priority</Label>
                  <Input type="number" value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))}
                    placeholder="0" className="mt-1" />
                  <p className="text-xs text-gray-400 mt-1">Higher = applied first</p>
                </div>
                <div>
                  <Label>Usage Limit</Label>
                  <Input type="number" value={form.usageLimit}
                    onChange={e => setForm(f => ({ ...f, usageLimit: e.target.value }))}
                    placeholder="Unlimited" className="mt-1" />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={form.isActive}
                    onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
                  <Label>Active</Label>
                </div>
              </div>

              {/* Conditions JSON */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Conditions (JSON)</Label>
                  <span className="text-xs text-gray-400">Defines when the rule triggers</span>
                </div>
                <Textarea value={form.conditions}
                  onChange={e => { setForm(f => ({ ...f, conditions: e.target.value })); validateJson(e.target.value, setCondError); }}
                  rows={5} className="font-mono text-xs" />
                {condError && <p className="text-xs text-red-500 mt-1">{condError}</p>}
                <div className="mt-2 p-3 bg-[#F5ECD7]/50 rounded-lg text-xs text-[#3E1F00]/60">
                  {form.type === "cart_total" && <><strong>cart_total:</strong> {"{ minAmount: 100 }"}</>}
                  {form.type === "quantity_tier" && <><strong>quantity_tier:</strong> {"{ tiers: [{minQty: 3, discountPct: 5}] }"}</>}
                  {form.type === "bogo" && <><strong>bogo:</strong> {"{ buyQty: 2, getQty: 1, productId: null }"}</>}
                  {form.type === "category_discount" && <><strong>category_discount:</strong> {"{ categoryId: 1 }"}</>}
                  {form.type === "product_discount" && <><strong>product_discount:</strong> {"{ productId: 5 }"}</>}
                  {form.type === "first_order" && <><strong>first_order:</strong> No conditions needed</>}
                  {form.type === "free_shipping" && <><strong>free_shipping:</strong> {"{ minAmount: 200 }"}</>}
                </div>
              </div>

              {/* Actions JSON */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Actions (JSON)</Label>
                  <span className="text-xs text-gray-400">Defines the discount applied</span>
                </div>
                <Textarea value={form.actions}
                  onChange={e => { setForm(f => ({ ...f, actions: e.target.value })); validateJson(e.target.value, setActError); }}
                  rows={5} className="font-mono text-xs" />
                {actError && <p className="text-xs text-red-500 mt-1">{actError}</p>}
                <div className="mt-2 p-3 bg-[#F5ECD7]/50 rounded-lg text-xs text-[#3E1F00]/60">
                  {(form.type === "cart_total" || form.type === "category_discount" || form.type === "product_discount" || form.type === "first_order") &&
                    <><strong>discountType:</strong> "percentage" | "fixed" &nbsp; <strong>discountValue:</strong> number</>}
                  {form.type === "free_shipping" && <><strong>shippingDiscount:</strong> 25 (AED amount)</>}
                  {form.type === "bogo" && <>BOGO: discount is auto-calculated from conditions</>}
                  {form.type === "quantity_tier" && <>Tiers: discount is auto-calculated from conditions</>}
                </div>
              </div>

              {/* Save */}
              <div className="flex gap-3 pt-2">
                <Button onClick={handleSave} disabled={upsertMutation.isPending || !form.name}
                  className="bg-[#C9A84C] hover:bg-[#B8963E] text-white flex-1">
                  {upsertMutation.isPending ? "Saving..." : form.id ? "Update Rule" : "Create Rule"}
                </Button>
                <Button variant="outline" onClick={() => setOpen(false)} className="border-[#E8D5A3]">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
