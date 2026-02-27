import Layout from "@/components/Layout";
import { useEffect, useState, useCallback } from "react";
import { usePixelTrack } from "@/components/PixelManager";
import { useCartStore } from "@/stores/cartStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { CreditCard, MapPin, Package, ShoppingBag, Truck, Navigation, Map, LogIn, Star, Plus, Home } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { OTPAuthModal } from "@/components/OTPAuthModal";
import { MapView } from "@/components/Map";

const UAE_EMIRATES = [
  "Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Umm Al Quwain", "Ras Al Khaimah", "Fujairah"
];

export default function Checkout() {
  const { track } = usePixelTrack();
  const { items, getSubtotal, getVat, getShipping, getTotal, discountAmount, couponCode, clearCart } = useCartStore();
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  useEffect(() => {
    track("InitiateCheckout", {
      value: getTotal(),
      currency: "AED",
      num_items: items.reduce((s, i) => s + i.quantity, 0),
      content_ids: items.map(i => String(i.productId)),
    });
  }, []);

  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "cod">("cod");
  const [step, setStep] = useState<"auth" | "shipping" | "payment" | "review">(isAuthenticated ? "shipping" : "auth");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"signup" | "login">("login");
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [selectedSavedAddress, setSelectedSavedAddress] = useState<number | null>(null);

  const [form, setForm] = useState({
    fullName: user?.name || "",
    phone: (user as any)?.phone || "",
    email: user?.email || "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    emirate: "Fujairah",
    notes: "",
    label: "Home",
    latitude: "",
    longitude: "",
    mapAddress: "",
  });

  const createOrder = trpc.orders.create.useMutation();
  const upsertAddress = trpc.addresses.upsert.useMutation();
  const { data: savedAddresses, refetch: refetchAddresses } = trpc.addresses.list.useQuery(undefined, { enabled: isAuthenticated });

  // When user logs in, advance from auth step to shipping
  useEffect(() => {
    if (isAuthenticated && step === "auth") {
      setStep("shipping");
      setForm((f) => ({ ...f, fullName: user?.name || f.fullName, phone: (user as any)?.phone || f.phone }));
    }
  }, [isAuthenticated]);

  // Pre-fill from default saved address
  useEffect(() => {
    if (savedAddresses && savedAddresses.length > 0 && !selectedSavedAddress) {
      const def = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
      applyAddress(def);
    }
  }, [savedAddresses]);

  function applyAddress(addr: any) {
    setSelectedSavedAddress(addr.id);
    setForm((f) => ({
      ...f,
      fullName: addr.fullName,
      phone: addr.phone,
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2 || "",
      city: addr.city,
      emirate: addr.emirate,
      label: addr.label || "Home",
      latitude: addr.latitude || "",
      longitude: addr.longitude || "",
      mapAddress: addr.mapAddress || "",
    }));
  }

  const handleFormChange = (field: string, value: string) => {
    setSelectedSavedAddress(null);
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // GPS location
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setForm((f) => ({ ...f, latitude: lat, longitude: lng }));
        try {
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ location: { lat: pos.coords.latitude, lng: pos.coords.longitude } }, (results, status) => {
            if (status === "OK" && results && results[0]) {
              const addr = results[0];
              const get = (type: string) => addr.address_components.find((c) => c.types.includes(type))?.long_name || "";
              setForm((f) => ({
                ...f,
                addressLine1: addr.formatted_address.split(",")[0] || f.addressLine1,
                city: get("locality") || get("sublocality") || f.city,
                emirate: UAE_EMIRATES.find((e) => addr.formatted_address.toLowerCase().includes(e.toLowerCase())) || f.emirate,
                mapAddress: addr.formatted_address,
              }));
              toast.success("Location detected and address filled");
            }
          });
        } catch { toast.success("Location set: " + lat + ", " + lng); }
        setIsGettingLocation(false);
      },
      (err) => { setIsGettingLocation(false); toast.error("Could not get location: " + err.message); },
      { timeout: 10000 }
    );
  };

  // Map picker
  const handleMapReady = useCallback((map: google.maps.Map) => {
    const center = form.latitude && form.longitude
      ? { lat: parseFloat(form.latitude), lng: parseFloat(form.longitude) }
      : { lat: 25.1288, lng: 56.3265 };
    map.setCenter(center);
    map.setZoom(15);
    const marker = new google.maps.Marker({ map, draggable: true, position: center });
    const geocoder = new google.maps.Geocoder();
    const reverseGeocode = (latLng: google.maps.LatLng) => {
      geocoder.geocode({ location: latLng }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          const addr = results[0];
          const get = (type: string) => addr.address_components.find((c) => c.types.includes(type))?.long_name || "";
          setForm((f) => ({
            ...f,
            latitude: latLng.lat().toFixed(6),
            longitude: latLng.lng().toFixed(6),
            addressLine1: addr.formatted_address.split(",")[0] || f.addressLine1,
            city: get("locality") || get("sublocality") || f.city,
            emirate: UAE_EMIRATES.find((e) => addr.formatted_address.toLowerCase().includes(e.toLowerCase())) || f.emirate,
            mapAddress: addr.formatted_address,
          }));
        }
      });
    };
    map.addListener("click", (e: google.maps.MapMouseEvent) => { if (e.latLng) { marker.setPosition(e.latLng); reverseGeocode(e.latLng); } });
    marker.addListener("dragend", () => { const pos = marker.getPosition(); if (pos) reverseGeocode(pos); });
  }, []);

  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.phone || !form.addressLine1 || !form.emirate) {
      toast.error("Please fill all required fields");
      return;
    }
    if (isAuthenticated && !selectedSavedAddress) {
      try {
        await upsertAddress.mutateAsync({
          fullName: form.fullName, phone: form.phone,
          addressLine1: form.addressLine1, addressLine2: form.addressLine2 || undefined,
          city: form.city, emirate: form.emirate, label: form.label,
          latitude: form.latitude || undefined, longitude: form.longitude || undefined,
          mapAddress: form.mapAddress || undefined,
          isDefault: !savedAddresses || savedAddresses.length === 0,
        });
        refetchAddresses();
      } catch { /* non-blocking */ }
    }
    setStep("payment");
  };

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await createOrder.mutateAsync({
        paymentMethod,
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          productNameEn: i.productNameEn,
          productNameAr: i.productNameAr,
          variantName: i.variantName,
          productImage: i.productImage,
        })),
        couponCode: couponCode || undefined,
        discountAmount: discountAmount || undefined,
        shippingFullName: form.fullName,
        shippingPhone: form.phone,
        shippingAddressLine1: form.addressLine1,
        shippingAddressLine2: form.addressLine2 || undefined,
        shippingCity: form.city,
        shippingEmirate: form.emirate,
        guestEmail: !isAuthenticated ? form.email : undefined,
        notes: form.notes || undefined,
      });

      clearCart();
      navigate(`/order-confirmation/${result.orderNumber}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to place order";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <ShoppingBag className="h-16 w-16 text-[#C9A84C] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#3E1F00] mb-2">Your cart is empty</h2>
          <Button asChild className="bg-[#C9A84C] hover:bg-[#9A7A2E] text-white mt-4">
            <Link href="/shop">Browse Products</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const allSteps: Array<"auth" | "shipping" | "payment" | "review"> = isAuthenticated
    ? ["shipping", "payment", "review"]
    : ["auth", "shipping", "payment", "review"];
  const stepLabels: Record<string, string> = { auth: "Account", shipping: "Shipping", payment: "Payment", review: "Review" };

  return (
    <Layout>
      <OTPAuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        mode={authMode}
        onSuccess={() => { setShowAuthModal(false); setStep("shipping"); }}
      />
      <div className="bg-[#3E1F00] text-white py-8">
        <div className="container">
          <h1 className="text-3xl font-bold" style={{ fontFamily: "Playfair Display, serif" }}>Checkout</h1>
          {/* Steps */}
          <div className="flex items-center gap-2 mt-4 text-sm">
            {allSteps.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <span className="text-[#C9A84C]/50">›</span>}
                <span className={`capitalize ${step === s ? "text-[#C9A84C] font-semibold" : "text-[#E8D5A3]/60"}`}>
                  {stepLabels[s]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Form */}
          <div className="lg:col-span-2">
            {/* Step 1: Shipping */}
            {/* AUTH STEP */}
            {step === "auth" && (
              <div className="bg-white rounded-xl p-8 border border-[#E8D5A3] text-center">
                <LogIn className="h-12 w-12 text-[#C9A84C] mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-[#3E1F00] mb-2">Welcome to Dates & Wheat</h2>
                <p className="text-muted-foreground mb-8">Sign in or create an account to continue checkout — it only takes a minute.</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto">
                  <Button
                    className="flex-1 bg-[#C9A84C] hover:bg-[#9A7A2E] text-white"
                    onClick={() => { setAuthMode("login"); setShowAuthModal(true); }}
                  >
                    <LogIn className="h-4 w-4 mr-2" /> Sign In
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C]/10"
                    onClick={() => { setAuthMode("signup"); setShowAuthModal(true); }}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Create Account
                  </Button>
                </div>
                <div className="mt-6">
                  <button
                    className="text-sm text-muted-foreground underline"
                    onClick={() => setStep("shipping")}
                  >
                    Continue as guest
                  </button>
                </div>
              </div>
            )}

            {/* SHIPPING STEP */}
            {step === "shipping" && (
              <form onSubmit={handleShippingSubmit} className="bg-white rounded-xl p-6 border border-[#E8D5A3]">
                <h2 className="text-xl font-bold text-[#3E1F00] mb-6 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[#C9A84C]" /> Delivery Address
                </h2>

                {/* Guest login prompt */}
                {!isAuthenticated && (
                  <div className="mb-6 p-4 rounded-lg bg-[#FFF8E7] border border-[#E8D5A3] flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-[#3E1F00]">Returning customer?</p>
                      <p className="text-xs text-muted-foreground">Sign in to use your saved addresses</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C]/10 shrink-0"
                      onClick={() => { setAuthMode("login"); setShowAuthModal(true); }}
                    >
                      <LogIn className="h-3 w-3 mr-1" /> Sign In
                    </Button>
                  </div>
                )}

                {/* Saved addresses */}
                {savedAddresses && savedAddresses.length > 0 && (
                  <div className="mb-6">
                    <p className="text-sm font-medium text-[#3E1F00] mb-3 flex items-center gap-2">
                      <Star className="h-4 w-4 text-[#C9A84C]" /> Saved Addresses
                    </p>
                    <div className="grid gap-2">
                      {savedAddresses.map((addr) => (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => applyAddress(addr)}
                          className={`text-left p-3 rounded-lg border-2 transition-all text-sm ${selectedSavedAddress === addr.id ? "border-[#C9A84C] bg-[#FFF8E7]" : "border-[#E8D5A3] hover:border-[#C9A84C]/50"}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Home className="h-3 w-3 text-[#C9A84C]" />
                            <span className="font-semibold text-[#3E1F00]">{addr.label || "Home"}</span>
                            {addr.isDefault && <Badge className="text-[10px] py-0 h-4 bg-[#C9A84C] text-white">Default</Badge>}
                          </div>
                          <p className="text-muted-foreground">{addr.addressLine1}, {addr.city}, {addr.emirate}</p>
                          {addr.mapAddress && <p className="text-xs text-[#C9A84C] mt-1 truncate">{addr.mapAddress}</p>}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-[#E8D5A3]" />
                      <span className="text-xs text-muted-foreground">or enter a new address</span>
                      <div className="flex-1 h-px bg-[#E8D5A3]" />
                    </div>
                  </div>
                )}

                {/* GPS + Map buttons */}
                <div className="flex gap-2 mb-5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C]/10"
                    onClick={handleUseMyLocation}
                    disabled={isGettingLocation}
                  >
                    <Navigation className={`h-4 w-4 mr-2 ${isGettingLocation ? "animate-spin" : ""}`} />
                    {isGettingLocation ? "Detecting..." : "Use My Location"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C]/10"
                    onClick={() => setShowMapPicker(!showMapPicker)}
                  >
                    <Map className="h-4 w-4 mr-2" />
                    {showMapPicker ? "Hide Map" : "Pick on Map"}
                  </Button>
                  {form.latitude && (
                    <span className="text-xs text-green-600 flex items-center gap-1 ml-auto">
                      <Navigation className="h-3 w-3" /> Location set
                    </span>
                  )}
                </div>

                {/* Map Picker */}
                {showMapPicker && (
                  <div className="mb-5 rounded-xl overflow-hidden border border-[#E8D5A3]" style={{ height: 280 }}>
                    <MapView onMapReady={handleMapReady} />
                  </div>
                )}
                {form.mapAddress && (
                  <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">
                    <MapPin className="h-4 w-4 inline mr-1" /> {form.mapAddress}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={form.fullName}
                      onChange={(e) => handleFormChange("fullName", e.target.value)}
                      placeholder="Your full name"
                      required
                      className="mt-1 border-[#E8D5A3] focus:border-[#C9A84C]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => handleFormChange("phone", e.target.value)}
                      placeholder="+971 XX XXX XXXX"
                      required
                      className="mt-1 border-[#E8D5A3] focus:border-[#C9A84C]"
                    />
                  </div>
                  {!isAuthenticated && (
                    <div>
                      <Label htmlFor="email">Email (optional)</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => handleFormChange("email", e.target.value)}
                        placeholder="your@email.com"
                        className="mt-1 border-[#E8D5A3] focus:border-[#C9A84C]"
                      />
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <Label htmlFor="addressLine1">Address Line 1 *</Label>
                    <Input
                      id="addressLine1"
                      value={form.addressLine1}
                      onChange={(e) => handleFormChange("addressLine1", e.target.value)}
                      placeholder="Street, building, villa number"
                      required
                      className="mt-1 border-[#E8D5A3] focus:border-[#C9A84C]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="addressLine2">Address Line 2</Label>
                    <Input
                      id="addressLine2"
                      value={form.addressLine2}
                      onChange={(e) => handleFormChange("addressLine2", e.target.value)}
                      placeholder="Apartment, floor, landmark (optional)"
                      className="mt-1 border-[#E8D5A3] focus:border-[#C9A84C]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) => handleFormChange("city", e.target.value)}
                      placeholder="City"
                      className="mt-1 border-[#E8D5A3] focus:border-[#C9A84C]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="emirate">Emirate *</Label>
                    <Select value={form.emirate} onValueChange={(v) => handleFormChange("emirate", v)}>
                      <SelectTrigger className="mt-1 border-[#E8D5A3]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UAE_EMIRATES.map((e) => (
                          <SelectItem key={e} value={e}>{e}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {isAuthenticated && (
                    <div>
                      <Label htmlFor="label">Address Label</Label>
                      <Select value={form.label} onValueChange={(v) => handleFormChange("label", v)}>
                        <SelectTrigger className="mt-1 border-[#E8D5A3]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Home">Home</SelectItem>
                          <SelectItem value="Work">Work</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <Label htmlFor="notes">Order Notes</Label>
                    <Input
                      id="notes"
                      value={form.notes}
                      onChange={(e) => handleFormChange("notes", e.target.value)}
                      placeholder="Special instructions for delivery (optional)"
                      className="mt-1 border-[#E8D5A3] focus:border-[#C9A84C]"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full mt-6 bg-[#C9A84C] hover:bg-[#9A7A2E] text-white">
                  Continue to Payment <Truck className="ml-2 h-4 w-4" />
                </Button>
              </form>
            )}

            {step === "payment" && (
              <div className="bg-white rounded-xl p-6 border border-[#E8D5A3]">
                <h2 className="text-xl font-bold text-[#3E1F00] mb-6 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-[#C9A84C]" /> Payment Method
                </h2>

                <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "stripe" | "cod")}>
                  <div className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${paymentMethod === "cod" ? "border-[#C9A84C] bg-[#FFF8F0]" : "border-[#E8D5A3]"}`}>
                    <RadioGroupItem value="cod" id="cod" className="mt-1" />
                    <Label htmlFor="cod" className="cursor-pointer flex-1">
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-[#C9A84C]" />
                        <span className="font-semibold text-[#3E1F00]">Cash on Delivery</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">Pay when your order arrives. Available across UAE.</p>
                    </Label>
                  </div>

                  <div className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors mt-3 ${paymentMethod === "stripe" ? "border-[#C9A84C] bg-[#FFF8F0]" : "border-[#E8D5A3]"}`}>
                    <RadioGroupItem value="stripe" id="stripe" className="mt-1" />
                    <Label htmlFor="stripe" className="cursor-pointer flex-1">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-[#C9A84C]" />
                        <span className="font-semibold text-[#3E1F00]">Credit / Debit Card</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">Secure payment via Stripe. Visa, Mastercard accepted.</p>
                      {paymentMethod === "stripe" && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                          You'll be redirected to Stripe's secure payment page after placing the order.
                        </div>
                      )}
                    </Label>
                  </div>
                </RadioGroup>

                <div className="flex gap-3 mt-6">
                  <Button variant="outline" onClick={() => setStep("shipping")} className="flex-1 border-[#C9A84C] text-[#C9A84C]">
                    Back
                  </Button>
                  <Button onClick={() => setStep("review")} className="flex-1 bg-[#C9A84C] hover:bg-[#9A7A2E] text-white font-semibold">
                    Review Order
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {step === "review" && (
              <div className="bg-white rounded-xl p-6 border border-[#E8D5A3]">
                <h2 className="text-xl font-bold text-[#3E1F00] mb-6">Review Your Order</h2>

                {/* Shipping summary */}
                <div className="bg-[#F5ECD7] rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-[#3E1F00] flex items-center gap-2">
                      <Truck className="h-4 w-4 text-[#C9A84C]" /> Shipping To
                    </h3>
                    <button onClick={() => setStep("shipping")} className="text-xs text-[#C9A84C] hover:underline">Edit</button>
                  </div>
                  <p className="text-sm text-[#3E1F00]">{form.fullName}</p>
                  <p className="text-sm text-muted-foreground">{form.addressLine1}{form.addressLine2 ? `, ${form.addressLine2}` : ""}</p>
                  <p className="text-sm text-muted-foreground">{form.city ? `${form.city}, ` : ""}{form.emirate}</p>
                  <p className="text-sm text-muted-foreground">{form.phone}</p>
                </div>

                {/* Payment summary */}
                <div className="bg-[#F5ECD7] rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-[#3E1F00] flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-[#C9A84C]" /> Payment
                    </h3>
                    <button onClick={() => setStep("payment")} className="text-xs text-[#C9A84C] hover:underline">Edit</button>
                  </div>
                  <p className="text-sm text-[#3E1F00]">
                    {paymentMethod === "cod" ? "Cash on Delivery" : "Credit / Debit Card (Stripe)"}
                  </p>
                </div>

                {/* Items */}
                <div className="space-y-3 mb-4">
                  {items.map((item) => (
                    <div key={`${item.productId}-${item.variantId}`} className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-[#F5ECD7] overflow-hidden shrink-0">
                        {item.productImage ? (
                          <img src={item.productImage} alt={item.productNameEn} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">🍬</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#3E1F00] truncate">{item.productNameEn}</p>
                        {item.variantName && <p className="text-xs text-muted-foreground">{item.variantName}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-[#3E1F00]">AED {(item.unitPrice * item.quantity).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">×{item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep("payment")} className="flex-1 border-[#C9A84C] text-[#C9A84C]">
                    Back
                  </Button>
                  <Button
                    onClick={handlePlaceOrder}
                    disabled={isSubmitting}
                    className="flex-1 bg-[#C9A84C] hover:bg-[#9A7A2E] text-white font-semibold h-12"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        Placing Order...
                      </span>
                    ) : (
                      `Place Order — AED ${getTotal().toFixed(2)}`
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Order Summary */}
          <div>
            <div className="bg-white rounded-xl p-5 border border-[#E8D5A3] sticky top-24">
              <h3 className="font-semibold text-[#3E1F00] mb-4">Order Summary</h3>
              <div className="space-y-2 text-sm max-h-48 overflow-y-auto mb-4">
                {items.map((item) => (
                  <div key={`${item.productId}-${item.variantId}`} className="flex justify-between">
                    <span className="text-muted-foreground truncate mr-2">{item.productNameEn} ×{item.quantity}</span>
                    <span className="shrink-0 font-medium">AED {(item.unitPrice * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <Separator className="bg-[#E8D5A3] mb-4" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>AED {getSubtotal().toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>- AED {discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT (5%)</span>
                  <span>AED {getVat().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className={getShipping() === 0 ? "text-green-600 font-medium" : ""}>
                    {getShipping() === 0 ? "FREE" : `AED ${getShipping().toFixed(2)}`}
                  </span>
                </div>
              </div>
              <Separator className="bg-[#E8D5A3] my-3" />
              <div className="flex justify-between font-bold text-[#3E1F00]">
                <span>Total</span>
                <span>AED {getTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
