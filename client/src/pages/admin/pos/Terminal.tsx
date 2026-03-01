import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { Minus, Plus, Search, ShoppingCart, Terminal, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type CartItem = {
  productId: number;
  name: string;
  price: number;
  qty: number;
  imageUrl?: string | null;
};

export default function POSTerminal() {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [showOpenSession, setShowOpenSession] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [openingCash, setOpeningCash] = useState("0");
  const [warehouseId, setWarehouseId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountTendered, setAmountTendered] = useState("");
  const [discount, setDiscount] = useState("0");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const { data: products = [] } = trpc.products.list.useQuery({ limit: 500 });
  const { data: warehouses = [] } = trpc.inventory.warehouses.list.useQuery();
  const { data: activeSessions = [] } = trpc.pos.sessions.list.useQuery({ limit: 5 });
  const { data: paymentMethods = [] } = trpc.pos.paymentMethods.list.useQuery();

  const openSessionMutation = trpc.pos.sessions.open.useMutation({
    onSuccess: (data) => {
      setSessionId(data.id);
      setShowOpenSession(false);
      toast.success("POS session opened");
    },
    onError: (e) => toast.error(e.message),
  });

  const createOrderMutation = trpc.pos.orders.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Order #${data.orderNumber} created`);
      setCart([]);
      setShowCheckout(false);
      setDiscount("0");
      setAmountTendered("");
      setCustomerName(""); setCustomerPhone("");
    },
    onError: (e) => toast.error(e.message),
  });

  // Use first open session if available
  useEffect(() => {
    const openSession = activeSessions.find((s: any) => s.status === "open");
    if (openSession && !sessionId) {
      setSessionId(openSession.id);
    }
  }, [activeSessions]);

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase();
    return (products as any[]).filter((p: any) =>
      !q || p.nameEn?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [products, search]);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        return prev.map(i => i.productId === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, {
        productId: product.id,
        name: product.nameEn,
        price: parseFloat(product.priceAed ?? "0"),
        qty: 1,
        imageUrl: product.imageUrl,
      }];
    });
  };

  const updateQty = (productId: number, delta: number) => {
    setCart(prev => prev
      .map(i => i.productId === productId ? { ...i, qty: Math.max(0, i.qty + delta) } : i)
      .filter(i => i.qty > 0)
    );
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(i => i.productId !== productId));
  };

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const discountAmount = parseFloat(discount) || 0;
  const vatAmount = (subtotal - discountAmount) * 0.05;
  const total = subtotal - discountAmount + vatAmount;
  const change = (parseFloat(amountTendered) || 0) - total;

  const handleCheckout = () => {
    if (!sessionId) { toast.error("Open a POS session first"); return; }
    if (cart.length === 0) { toast.error("Cart is empty"); return; }
    createOrderMutation.mutate({
      sessionId,
      items: cart.map(i => ({ productId: i.productId, productName: i.name, qty: String(i.qty), unitPrice: String(i.price) })),
      paymentMethod,
      discountAmount: String(discountAmount),
      vatAmount: String(vatAmount),
      amountPaid: amountTendered || String(total),
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
    });
  };

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-120px)] flex gap-4">
        {/* Left: Product Grid */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Session Banner */}
          {!sessionId ? (
            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
              <span className="text-amber-800 text-sm font-medium">No active POS session. Open one to start selling.</span>
              <Button size="sm" onClick={() => setShowOpenSession(true)} className="bg-[#C9A84C] hover:bg-[#b8943e]">
                <Terminal className="h-3.5 w-3.5 mr-1.5" /> Open Session
              </Button>
            </div>
          ) : (
            <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-800 text-sm">Session Active — Session #{sessionId}</span>
            </div>
          )}

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search products..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="bg-white rounded-xl border border-[#E8D5A3] p-3 text-left hover:border-[#C9A84C] hover:shadow-md transition-all group"
                >
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.nameEn} className="w-full h-20 object-cover rounded-lg mb-2" />
                  ) : (
                    <div className="w-full h-20 bg-[#F5ECD7] rounded-lg mb-2 flex items-center justify-center">
                      <ShoppingCart className="h-6 w-6 text-[#C9A84C]/40" />
                    </div>
                  )}
                  <p className="text-sm font-medium text-[#3E1F00] line-clamp-2 leading-tight">{p.nameEn}</p>
                  <p className="text-sm font-bold text-[#C9A84C] mt-1">AED {parseFloat(p.priceAed ?? "0").toFixed(2)}</p>
                  {p.stockQty !== undefined && (
                    <p className="text-xs text-muted-foreground">Stock: {p.stockQty}</p>
                  )}
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <div className="col-span-4 text-center py-12 text-muted-foreground">No products found</div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Cart */}
        <div className="w-80 flex flex-col bg-white rounded-xl border border-[#E8D5A3] shrink-0">
          <div className="p-4 border-b border-[#E8D5A3]">
            <h2 className="font-semibold text-[#3E1F00] flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" /> Cart
              {cart.length > 0 && <Badge className="bg-[#C9A84C] text-white ml-auto">{cart.length}</Badge>}
            </h2>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Cart is empty</div>
            ) : cart.map(item => (
              <div key={item.productId} className="flex items-center gap-2 p-2 bg-[#F5ECD7]/50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-[#C9A84C]">AED {item.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateQty(item.productId, -1)} className="w-6 h-6 rounded-full bg-white border flex items-center justify-center hover:bg-[#F5ECD7]">
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-6 text-center text-sm font-medium">{item.qty}</span>
                  <button onClick={() => updateQty(item.productId, 1)} className="w-6 h-6 rounded-full bg-white border flex items-center justify-center hover:bg-[#F5ECD7]">
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <button onClick={() => removeFromCart(item.productId)} className="text-red-400 hover:text-red-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="p-4 border-t border-[#E8D5A3] space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>AED {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">VAT (5%)</span>
              <span>AED {vatAmount.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-[#3E1F00]">
              <span>Total</span>
              <span>AED {total.toFixed(2)}</span>
            </div>
            <Button
              className="w-full bg-[#C9A84C] hover:bg-[#b8943e] mt-2"
              disabled={cart.length === 0 || !sessionId}
              onClick={() => setShowCheckout(true)}
            >
              Checkout
            </Button>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" className="w-full text-red-500" onClick={() => setCart([])}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear Cart
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Open Session Dialog */}
      <Dialog open={showOpenSession} onOpenChange={setShowOpenSession}>
        <DialogContent>
          <DialogHeader><DialogTitle>Open POS Session</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Warehouse</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map(w => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Opening Cash (AED)</Label>
              <Input type="number" value={openingCash} onChange={e => setOpeningCash(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpenSession(false)}>Cancel</Button>
            <Button onClick={() => openSessionMutation.mutate({ warehouseId: warehouseId ? parseInt(warehouseId) : 0, openingCash })}
              disabled={openSessionMutation.isPending} className="bg-[#C9A84C] hover:bg-[#b8943e]">
              {openSessionMutation.isPending ? "Opening..." : "Open Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent>
          <DialogHeader><DialogTitle>Checkout</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="bg-[#F5ECD7] rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-sm"><span>Subtotal</span><span>AED {subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span>Discount</span><span className="text-red-600">- AED {discountAmount.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span>VAT (5%)</span><span>AED {vatAmount.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-[#3E1F00]"><span>Total</span><span>AED {total.toFixed(2)}</span></div>
            </div>
            <div>
              <Label>Discount (AED)</Label>
              <Input type="number" value={discount} onChange={e => setDiscount(e.target.value)} />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  {paymentMethods.map((pm: any) => (
                    <SelectItem key={pm.id} value={pm.code}>{pm.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {paymentMethod === "cash" && (
              <div>
                <Label>Amount Tendered (AED)</Label>
                <Input type="number" value={amountTendered} onChange={e => setAmountTendered(e.target.value)} placeholder={total.toFixed(2)} />
                {parseFloat(amountTendered) > 0 && (
                  <p className={`text-sm mt-1 ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
                    Change: AED {change.toFixed(2)}
                  </p>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Customer Name</Label>
                <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Optional" />
              </div>
              <div>
                <Label>Customer Phone</Label>
                <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Optional" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckout(false)}>Cancel</Button>
            <Button onClick={handleCheckout} disabled={createOrderMutation.isPending} className="bg-[#C9A84C] hover:bg-[#b8943e]">
              {createOrderMutation.isPending ? "Processing..." : `Charge AED ${total.toFixed(2)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
