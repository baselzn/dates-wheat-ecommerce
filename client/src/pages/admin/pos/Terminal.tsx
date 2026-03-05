import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ShoppingCart, Search, Plus, Minus, Trash2, CreditCard, Banknote,
  PauseCircle, PlayCircle, X, User, Percent, Receipt, RefreshCw,
  ChevronDown, ChevronUp, Package, AlertCircle, CheckCircle2, Star
} from "lucide-react";

interface CartItem {
  productId: number;
  variantId?: number;
  productName: string;
  sku?: string;
  qty: number;
  unitPrice: number;
  discountAmount: number;
  imageUrl?: string;
}

const VAT_RATE = 0.05;

export default function POSTerminal() {
  const utils = trpc.useUtils();

  // Session state
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [showOpenSession, setShowOpenSession] = useState(false);
  const [openingCash, setOpeningCash] = useState("0");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
  const [showCloseSession, setShowCloseSession] = useState(false);
  const [closingCash, setClosingCash] = useState("");
  const [closeNotes, setCloseNotes] = useState("");

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");

  // UI state
  const [productSearch, setProductSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [showHeldOrders, setShowHeldOrders] = useState(false);
  const [showCustomer, setShowCustomer] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [refundOrderId, setRefundOrderId] = useState<number | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [discountType, setDiscountType] = useState<"amount" | "percent">("amount");
  const [discountInput, setDiscountInput] = useState("0");
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [lastOrderItems, setLastOrderItems] = useState<CartItem[]>([]);
  const [lastAmountPaid, setLastAmountPaid] = useState("0");
  const [lastPaymentMethod, setLastPaymentMethod] = useState("cash");
  const [selectedItemIdx, setSelectedItemIdx] = useState<number | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: activeSession, refetch: refetchSession } = trpc.pos.sessions.getActive.useQuery();
  const { data: warehouses } = trpc.inventory.warehouses.list.useQuery();
  const { data: productsData } = trpc.products.list.useQuery({ limit: 200, page: 1 });
  const products = productsData?.products ?? [];
  const { data: favoritesData, refetch: refetchFavorites } = trpc.pos.favorites.list.useQuery();
  const favoriteIds = new Set((favoritesData ?? []).map((f: any) => f.productId as number));
  const addFavorite = trpc.pos.favorites.add.useMutation({ onSuccess: () => void refetchFavorites() });
  const removeFavorite = trpc.pos.favorites.remove.useMutation({ onSuccess: () => void refetchFavorites() });
  const toggleFavorite = (e: React.MouseEvent, productId: number) => {
    e.stopPropagation();
    if (favoriteIds.has(productId)) removeFavorite.mutate({ productId });
    else addFavorite.mutate({ productId });
  };
  const { data: paymentMethods } = trpc.pos.paymentMethods.list.useQuery();
  const { data: heldOrders, refetch: refetchHeld } = trpc.pos.heldOrders.list.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId }
  );
  const { data: posSettings } = trpc.pos.settings.getAll.useQuery();
  const { data: customerResults } = trpc.pos.customers.search.useQuery(
    { query: customerSearch },
    { enabled: customerSearch.length >= 2 }
  );

  useEffect(() => {
    if (activeSession && !sessionId) setSessionId(activeSession.id);
  }, [activeSession]);

  // Mutations
  const openSession = trpc.pos.sessions.open.useMutation({
    onSuccess: (data) => {
      setSessionId(data.id);
      setShowOpenSession(false);
      refetchSession();
      toast.success(`Session ${data.sessionNumber} opened`);
    },
    onError: (e) => toast.error(e.message),
  });
  const closeSession = trpc.pos.sessions.close.useMutation({
    onSuccess: (data) => {
      setShowCloseSession(false);
      setSessionId(null);
      refetchSession();
      const v = typeof data.variance === "number" ? data.variance : parseFloat(String(data.variance));
      toast.success(`Session closed. Cash variance: ${v >= 0 ? "+" : ""}${v.toFixed(2)} AED`);
    },
    onError: (e) => toast.error(e.message),
  });
  const createOrder = trpc.pos.orders.create.useMutation({
    onSuccess: (data) => {
      setLastOrder(data);
      setLastOrderItems([...cart]);
      setLastAmountPaid(amountPaid);
      setLastPaymentMethod(paymentMethod);
      setCart([]);
      setOrderDiscount(0);
      setCustomerName("");
      setCustomerPhone("");
      setNotes("");
      setAmountPaid("");
      setShowPayment(false);
      setShowReceipt(true);
      refetchSession();
      toast.success(`Order ${data.orderNumber} completed`);
    },
    onError: (e) => toast.error(e.message),
  });
  const holdOrder = trpc.pos.heldOrders.hold.useMutation({
    onSuccess: () => {
      setCart([]);
      setOrderDiscount(0);
      refetchHeld();
      toast.success("Order held");
    },
  });
  const retrieveHeld = trpc.pos.heldOrders.retrieve.useMutation({
    onSuccess: (data) => {
      const items = (data.items as any[]).map((i: any) => ({
        productId: i.productId,
        variantId: i.variantId,
        productName: i.productName,
        sku: i.sku,
        qty: i.qty,
        unitPrice: i.unitPrice,
        discountAmount: i.discountAmount ?? 0,
        imageUrl: i.imageUrl,
      }));
      setCart(items);
      setOrderDiscount(parseFloat(data.discountAmount));
      setCustomerName(data.customerName ?? "");
      setCustomerPhone(data.customerPhone ?? "");
      setShowHeldOrders(false);
      refetchHeld();
      toast.success("Order retrieved");
    },
  });
  const deleteHeld = trpc.pos.heldOrders.delete.useMutation({
    onSuccess: () => refetchHeld(),
  });
  const refundOrder = trpc.pos.orders.refund.useMutation({
    onSuccess: () => {
      setShowRefund(false);
      setRefundOrderId(null);
      setRefundReason("");
      toast.success("Order refunded and stock restored");
    },
    onError: (e) => toast.error(e.message),
  });

  // Computed totals
  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.qty - i.discountAmount, 0);
  const vatAmount = (subtotal - orderDiscount) * VAT_RATE;
  const total = subtotal - orderDiscount + vatAmount;
  const change = parseFloat(amountPaid || "0") - total;

  // Filtered products
  const filteredProducts = products.filter((p: any) =>
    p.isActive && (
      !productSearch ||
      p.nameEn.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.nameAr?.includes(productSearch) ||
      (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase()))
    )
  );

  const addToCart = useCallback((product: any) => {
    setCart(prev => {
      const idx = prev.findIndex(i => i.productId === product.id && !i.variantId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], qty: updated[idx].qty + 1 };
        return updated;
      }
      let images: string[] = [];
      try { images = product.images ? JSON.parse(product.images) : []; } catch {}
      return [...prev, {
        productId: product.id,
        productName: product.nameEn,
        sku: product.sku ?? undefined,
        qty: 1,
        unitPrice: parseFloat(product.basePrice),
        discountAmount: 0,
        imageUrl: images[0],
      }];
    });
  }, []);

  const updateQty = (idx: number, delta: number) => {
    setCart(prev => {
      const updated = [...prev];
      const newQty = updated[idx].qty + delta;
      if (newQty <= 0) {
        updated.splice(idx, 1);
        if (selectedItemIdx === idx) setSelectedItemIdx(null);
      } else {
        updated[idx] = { ...updated[idx], qty: newQty };
      }
      return updated;
    });
  };

  const removeItem = (idx: number) => {
    setCart(prev => { const u = [...prev]; u.splice(idx, 1); return u; });
    if (selectedItemIdx === idx) setSelectedItemIdx(null);
  };

  const applyDiscount = () => {
    const val = parseFloat(discountInput) || 0;
    const amount = discountType === "percent" ? subtotal * (val / 100) : val;
    setOrderDiscount(Math.min(amount, subtotal));
    setShowDiscount(false);
  };

  const handleCheckout = useCallback(() => {
    if (!sessionId) { toast.error("No open session"); return; }
    if (cart.length === 0) { toast.error("Cart is empty"); return; }
    setAmountPaid(total.toFixed(2));
    setShowPayment(true);
  }, [sessionId, cart, total]);

  const handleConfirmPayment = () => {
    if (!sessionId) return;
    const paid = parseFloat(amountPaid);
    if (isNaN(paid) || paid < total) {
      toast.error("Amount paid is less than total");
      return;
    }
    createOrder.mutate({
      sessionId,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      items: cart.map(i => ({
        productId: i.productId,
        variantId: i.variantId,
        productName: i.productName,
        sku: i.sku,
        qty: String(i.qty),
        unitPrice: String(i.unitPrice),
        discountAmount: String(i.discountAmount),
      })),
      discountAmount: String(orderDiscount),
      vatAmount: String(vatAmount),
      paymentMethod,
      amountPaid,
      notes: notes || undefined,
    });
  };

  const handleHold = () => {
    if (!sessionId || cart.length === 0) return;
    holdOrder.mutate({
      sessionId,
      label: customerName || `Order ${new Date().toLocaleTimeString()}`,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      items: cart.map(i => ({
        productId: i.productId,
        variantId: i.variantId,
        productName: i.productName,
        sku: i.sku,
        qty: i.qty,
        unitPrice: i.unitPrice,
        discountAmount: i.discountAmount,
        imageUrl: i.imageUrl,
      })),
      discountAmount: orderDiscount,
    });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F2") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "F4") { e.preventDefault(); handleCheckout(); }
      if (e.key === "Escape") { setShowPayment(false); setShowDiscount(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleCheckout]);

  if (!sessionId && !activeSession) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="w-10 h-10 text-amber-700" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">POS Terminal</h2>
          <p className="text-gray-500 mb-6">Open a session to start selling</p>
          <Button size="lg" onClick={() => setShowOpenSession(true)} className="bg-amber-700 hover:bg-amber-800">
            Open Session
          </Button>
        </div>

        <Dialog open={showOpenSession} onOpenChange={setShowOpenSession}>
          <DialogContent>
            <DialogHeader><DialogTitle>Open POS Session</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Warehouse / Register</Label>
                <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                  <SelectContent>
                    {(warehouses ?? []).map((w: any) => (
                      <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(warehouses ?? []).length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No warehouses found. Please create one in Inventory → Warehouses first.</p>
                )}
              </div>
              <div>
                <Label>Opening Cash (AED)</Label>
                <Input type="number" value={openingCash} onChange={e => setOpeningCash(e.target.value)} className="mt-1" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowOpenSession(false)}>Cancel</Button>
              <Button
                className="bg-amber-700 hover:bg-amber-800"
                disabled={!selectedWarehouse || openSession.isPending}
                onClick={() => openSession.mutate({ warehouseId: parseInt(selectedWarehouse), openingCash })}
              >
                {openSession.isPending ? "Opening..." : "Open Session"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50 overflow-hidden">
      {/* ── Left: Product Grid ── */}
      <div className="flex flex-col flex-1 min-w-0 border-r border-gray-200 bg-white">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-white flex-wrap">
          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input ref={searchRef} placeholder="Search products... (F2)" value={productSearch}
              onChange={e => setProductSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 whitespace-nowrap text-xs">
            ● Session #{activeSession?.sessionNumber?.split("-")[1] ?? sessionId}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => setShowHeldOrders(true)} className="gap-1 h-9">
            <PauseCircle className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Held</span>
            {(heldOrders?.length ?? 0) > 0 && (
              <Badge className="ml-1 h-4 w-4 p-0 flex items-center justify-center bg-amber-600 text-white text-xs">
                {heldOrders!.length}
              </Badge>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowRefund(true)} className="gap-1 h-9 text-red-600 border-red-200 hover:bg-red-50">
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Refund</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowCloseSession(true)} className="gap-1 h-9 text-gray-600">
            <X className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Close</span>
          </Button>
        </div>

        {/* Favorites Tab Toggle */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setShowFavorites(false)}
            className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
              !showFavorites ? "border-b-2 border-amber-600 text-amber-700" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            All Products
          </button>
          <button
            onClick={() => setShowFavorites(true)}
            className={`flex-1 py-1.5 text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
              showFavorites ? "border-b-2 border-amber-600 text-amber-700" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Star className="w-3 h-3" />
            Favorites {favoriteIds.size > 0 && `(${favoriteIds.size})`}
          </button>
        </div>
        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {(showFavorites ? (favoritesData ?? []) : filteredProducts).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <Package className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {(showFavorites ? (favoritesData ?? []) : filteredProducts).map((product: any) => {
                let images: string[] = [];
                try { images = product.images ? JSON.parse(product.images) : []; } catch {}
                const inCartItem = cart.find(i => i.productId === product.id);
                const isFav = favoriteIds.has(product.id ?? product.productId);
                return (
                  <button key={product.id ?? product.productId} onClick={() => addToCart(product)}
                    className={`relative flex flex-col items-center p-2 rounded-xl border-2 text-left transition-all hover:shadow-md active:scale-95 ${
                      inCartItem ? "border-amber-500 bg-amber-50" : "border-gray-200 bg-white hover:border-amber-300"
                    }`}
                  >
                    {inCartItem && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-amber-600 rounded-full flex items-center justify-center z-10">
                        <span className="text-white text-xs font-bold">{inCartItem.qty}</span>
                      </div>
                    )}
                    {/* Star toggle */}
                    <button
                      onClick={(e) => toggleFavorite(e, product.id ?? product.productId)}
                      className={`absolute top-1 left-1 z-10 w-5 h-5 flex items-center justify-center rounded-full transition-colors ${
                        isFav ? "text-amber-500" : "text-gray-300 hover:text-amber-400"
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${isFav ? "fill-amber-500" : ""}`} />
                    </button>
                    <div className="w-full aspect-square rounded-lg overflow-hidden bg-gray-100 mb-2">
                      {images[0] ? (
                        <img src={images[0]} alt={product.nameEn} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-medium text-gray-800 text-center leading-tight line-clamp-2 w-full">
                      {product.nameEn}
                    </p>
                    <p className="text-sm font-bold text-amber-700 mt-1">
                      {parseFloat(product.basePrice).toFixed(2)} AED
                    </p>
                    {product.stockQty <= 5 && (
                      <span className="text-xs text-red-500 mt-0.5">Low: {product.stockQty}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Cart & Totals ── */}
      <div className="flex flex-col w-72 xl:w-80 bg-white border-l border-gray-200 shrink-0">
        {/* Customer Bar */}
        <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
          <button onClick={() => setShowCustomer(!showCustomer)}
            className="flex items-center gap-2 w-full text-sm text-gray-600 hover:text-gray-900">
            <User className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left truncate text-xs">{customerName || "Walk-in Customer"}</span>
            {showCustomer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showCustomer && (
            <div className="mt-2 space-y-2">
              <Input placeholder="Search customer..." value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)} className="h-7 text-xs" />
              {customerResults && (customerResults as any[]).length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  {(customerResults as any[]).map((c: any) => (
                    <button key={c.id}
                      onClick={() => { setCustomerName(c.name ?? ""); setCustomerPhone(c.phone ?? ""); setCustomerSearch(""); setShowCustomer(false); }}
                      className="flex flex-col w-full px-3 py-2 text-left text-xs hover:bg-amber-50 border-b last:border-0">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-gray-500">{c.phone}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-1">
                <Input placeholder="Name" value={customerName} onChange={e => setCustomerName(e.target.value)} className="h-7 text-xs" />
                <Input placeholder="Phone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="h-7 text-xs" />
              </div>
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
              <ShoppingCart className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs mt-1">Click products to add</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {cart.map((item, idx) => (
                <div key={idx} onClick={() => setSelectedItemIdx(idx === selectedItemIdx ? null : idx)}
                  className={`px-3 py-2 cursor-pointer transition-colors ${selectedItemIdx === idx ? "bg-amber-50" : "hover:bg-gray-50"}`}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{item.productName}</p>
                      {item.sku && <p className="text-xs text-gray-400">{item.sku}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-gray-900">
                        {(item.unitPrice * item.qty - item.discountAmount).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-400">{item.unitPrice.toFixed(2)} × {item.qty}</p>
                    </div>
                  </div>
                  {selectedItemIdx === idx && (
                    <div className="flex items-center gap-2 mt-2">
                      <Button size="icon" variant="outline" className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); updateQty(idx, -1); }}>
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="text-sm font-bold w-5 text-center">{item.qty}</span>
                      <Button size="icon" variant="outline" className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); updateQty(idx, 1); }}>
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="outline" className="h-6 w-6 text-red-500 border-red-200 ml-auto"
                        onClick={(e) => { e.stopPropagation(); removeItem(idx); }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals & Actions */}
        <div className="border-t border-gray-200 bg-white">
          <div className="px-3 py-2 space-y-1 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span><span>{subtotal.toFixed(2)} AED</span>
            </div>
            {orderDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span><span>-{orderDiscount.toFixed(2)} AED</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>VAT (5%)</span><span>{vatAmount.toFixed(2)} AED</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-bold text-gray-900">
              <span>Total</span><span>{total.toFixed(2)} AED</span>
            </div>
          </div>
          <div className="px-3 pb-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowDiscount(true)}
                disabled={cart.length === 0} className="gap-1 text-xs h-8">
                <Percent className="w-3 h-3" /> Discount
              </Button>
              <Button variant="outline" size="sm" onClick={handleHold}
                disabled={cart.length === 0 || holdOrder.isPending} className="gap-1 text-xs h-8">
                <PauseCircle className="w-3 h-3" /> Hold
              </Button>
            </div>
            <Button className="w-full bg-amber-700 hover:bg-amber-800 text-white font-bold py-2.5 text-sm gap-2"
              disabled={cart.length === 0 || !sessionId} onClick={handleCheckout}>
              <CreditCard className="w-4 h-4" />
              Checkout (F4) — {total.toFixed(2)} AED
            </Button>
          </div>
        </div>
      </div>

      {/* ── Payment Dialog ── */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Process Payment</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-amber-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500 mb-1">Total Due</p>
              <p className="text-4xl font-bold text-amber-700">{total.toFixed(2)}</p>
              <p className="text-sm text-gray-500">AED</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Payment Method</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {(paymentMethods ?? []).filter((m: any) => m.isActive).map((m: any) => (
                  <button key={m.id} onClick={() => setPaymentMethod(m.name)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                      paymentMethod === m.name ? "border-amber-600 bg-amber-50 text-amber-700" : "border-gray-200 hover:border-amber-300"
                    }`}>
                    {m.type === "cash" ? <Banknote className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                    {m.name}
                  </button>
                ))}
                {(paymentMethods ?? []).length === 0 && (
                  <>
                    <button onClick={() => setPaymentMethod("cash")}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-medium ${paymentMethod === "cash" ? "border-amber-600 bg-amber-50 text-amber-700" : "border-gray-200"}`}>
                      <Banknote className="w-4 h-4" /> Cash
                    </button>
                    <button onClick={() => setPaymentMethod("card")}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-medium ${paymentMethod === "card" ? "border-amber-600 bg-amber-50 text-amber-700" : "border-gray-200"}`}>
                      <CreditCard className="w-4 h-4" /> Card
                    </button>
                  </>
                )}
              </div>
            </div>
            <div>
              <Label>Amount Received (AED)</Label>
              <Input type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)}
                className="mt-1 text-lg font-bold" autoFocus />
              <div className="grid grid-cols-4 gap-1 mt-2">
                {[total, Math.ceil(total / 10) * 10, Math.ceil(total / 50) * 50, Math.ceil(total / 100) * 100]
                  .filter((v, i, arr) => arr.indexOf(v) === i)
                  .map((v, i) => (
                    <button key={i} onClick={() => setAmountPaid(v.toFixed(2))}
                      className="text-xs py-1 px-2 rounded border border-gray-200 hover:bg-amber-50 hover:border-amber-300">
                      {v.toFixed(0)}
                    </button>
                  ))}
              </div>
            </div>
            {parseFloat(amountPaid) >= total && (
              <div className="bg-green-50 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-700">Change Due</p>
                  <p className="text-xl font-bold text-green-700">{change.toFixed(2)} AED</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(false)}>Cancel</Button>
            <Button className="bg-amber-700 hover:bg-amber-800" onClick={handleConfirmPayment}
              disabled={createOrder.isPending || parseFloat(amountPaid || "0") < total}>
              {createOrder.isPending ? "Processing..." : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Receipt Dialog ── */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Receipt className="w-5 h-5" /> Receipt</DialogTitle></DialogHeader>
          {lastOrder && (
            <div className="space-y-3 text-sm font-mono">
              <div className="text-center border-b pb-3">
                <p className="font-bold text-base">{posSettings?.receipt_store_name ?? "Dates & Wheat"}</p>
                <p className="text-gray-500 text-xs">{posSettings?.receipt_store_address}</p>
                <p className="text-gray-500 text-xs">{posSettings?.receipt_store_phone}</p>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Order: {lastOrder.orderNumber}</span>
                <span>{new Date().toLocaleString()}</span>
              </div>
              <div className="space-y-1 text-xs">
                {lastOrderItems.map((item, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="flex-1 truncate">{item.productName} × {item.qty}</span>
                    <span className="ml-2 shrink-0">{(item.unitPrice * item.qty - item.discountAmount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-2 space-y-1 text-xs">
                {orderDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span><span>-{orderDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-500">
                  <span>VAT (5%)</span><span>{vatAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm">
                  <span>Total</span><span>{parseFloat(lastOrder.total).toFixed(2)} AED</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Paid ({lastPaymentMethod})</span>
                  <span>{parseFloat(lastAmountPaid).toFixed(2)}</span>
                </div>
                {parseFloat(lastOrder.change) > 0 && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Change</span><span>{parseFloat(lastOrder.change).toFixed(2)} AED</span>
                  </div>
                )}
              </div>
              <p className="text-center text-xs text-gray-400 border-t pt-2">
                {posSettings?.receipt_footer_message ?? "Thank you for your purchase!"}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => window.print()} className="gap-2">
              <Receipt className="w-4 h-4" /> Print
            </Button>
            <Button className="bg-amber-700 hover:bg-amber-800" onClick={() => setShowReceipt(false)}>
              New Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Held Orders Dialog ── */}
      <Dialog open={showHeldOrders} onOpenChange={setShowHeldOrders}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><PauseCircle className="w-5 h-5" /> Held Orders</DialogTitle></DialogHeader>
          {!heldOrders || heldOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <PauseCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No held orders</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {heldOrders.map((h: any) => (
                <div key={h.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{h.label ?? `Held #${h.id}`}</p>
                    {h.customerName && <p className="text-xs text-gray-500">{h.customerName}</p>}
                    <p className="text-xs text-gray-400">{new Date(h.createdAt).toLocaleTimeString()}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="outline" className="gap-1 text-xs h-8"
                      onClick={() => retrieveHeld.mutate({ id: h.id })}>
                      <PlayCircle className="w-3 h-3" /> Retrieve
                    </Button>
                    <Button size="icon" variant="outline" className="h-8 w-8 text-red-500"
                      onClick={() => deleteHeld.mutate({ id: h.id })}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Discount Dialog ── */}
      <Dialog open={showDiscount} onOpenChange={setShowDiscount}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>Apply Discount</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setDiscountType("amount")}
                className={`py-2 rounded-lg border-2 text-sm font-medium ${discountType === "amount" ? "border-amber-600 bg-amber-50" : "border-gray-200"}`}>
                Fixed (AED)
              </button>
              <button onClick={() => setDiscountType("percent")}
                className={`py-2 rounded-lg border-2 text-sm font-medium ${discountType === "percent" ? "border-amber-600 bg-amber-50" : "border-gray-200"}`}>
                Percentage (%)
              </button>
            </div>
            <Input type="number" value={discountInput} onChange={e => setDiscountInput(e.target.value)}
              placeholder={discountType === "percent" ? "e.g. 10" : "e.g. 5.00"} autoFocus />
            <p className="text-xs text-gray-500">
              Discount: {discountType === "percent"
                ? `${discountInput}% = ${(subtotal * (parseFloat(discountInput) / 100)).toFixed(2)} AED`
                : `${discountInput} AED`}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDiscount(false)}>Cancel</Button>
            <Button className="bg-amber-700 hover:bg-amber-800" onClick={applyDiscount}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Close Session Dialog ── */}
      <Dialog open={showCloseSession} onOpenChange={setShowCloseSession}>
        <DialogContent>
          <DialogHeader><DialogTitle>Close POS Session</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {activeSession && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Session</span>
                  <span className="font-medium">{activeSession.sessionNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Sales</span>
                  <span className="font-medium">{parseFloat(activeSession.totalSales ?? "0").toFixed(2)} AED</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Orders</span>
                  <span className="font-medium">{activeSession.totalOrders}</span>
                </div>
              </div>
            )}
            <div>
              <Label>Closing Cash Count (AED)</Label>
              <Input type="number" value={closingCash} onChange={e => setClosingCash(e.target.value)}
                className="mt-1" placeholder="Count your cash drawer" />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input value={closeNotes} onChange={e => setCloseNotes(e.target.value)} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseSession(false)}>Cancel</Button>
            <Button variant="destructive" disabled={!closingCash || closeSession.isPending}
              onClick={() => closeSession.mutate({ id: sessionId!, closingCash, notes: closeNotes })}>
              {closeSession.isPending ? "Closing..." : "Close Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Refund Dialog ── */}
      <Dialog open={showRefund} onOpenChange={setShowRefund}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-red-600"><AlertCircle className="w-5 h-5" /> Process Refund</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>POS Order ID</Label>
              <Input type="number" placeholder="Enter order ID"
                value={refundOrderId ?? ""} onChange={e => setRefundOrderId(parseInt(e.target.value) || null)} className="mt-1" />
            </div>
            <div>
              <Label>Reason for Refund</Label>
              <Input value={refundReason} onChange={e => setRefundReason(e.target.value)}
                placeholder="Customer request, defective item..." className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefund(false)}>Cancel</Button>
            <Button variant="destructive" disabled={!refundOrderId || refundOrder.isPending}
              onClick={() => refundOrder.mutate({ id: refundOrderId!, reason: refundReason })}>
              {refundOrder.isPending ? "Processing..." : "Process Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
