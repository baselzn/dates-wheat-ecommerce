import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { LogOut, MapPin, Package, Plus, Trash2, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function Account() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [, navigate] = useLocation();

  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/auth");
  }, [loading, isAuthenticated]);

  useEffect(() => {
    if (user) {
      setProfileName(user.name || "");
      setProfileEmail(user.email || "");
    }
  }, [user]);

  const { data: orders, isLoading: ordersLoading } = trpc.orders.myOrders.useQuery(undefined, { enabled: isAuthenticated });
  const { data: addresses, isLoading: addrLoading } = trpc.addresses.list.useQuery(undefined, { enabled: isAuthenticated });

  const updateProfile = trpc.auth.updateProfile.useMutation();
  const upsertAddress = trpc.addresses.upsert.useMutation();
  const deleteAddress = trpc.addresses.delete.useMutation();
  const utils = trpc.useUtils();

  const [newAddr, setNewAddr] = useState({
    label: "", fullName: "", phone: "", addressLine1: "", addressLine2: "", city: "", emirate: "Fujairah", isDefault: false,
  });
  const [showAddrForm, setShowAddrForm] = useState(false);

  const handleProfileSave = async () => {
    try {
      await updateProfile.mutateAsync({ name: profileName, email: profileEmail || undefined });
      await utils.auth.me.invalidate();
      toast.success("Profile updated!");
    } catch {
      toast.error("Failed to update profile");
    }
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await upsertAddress.mutateAsync(newAddr);
      await utils.addresses.list.invalidate();
      setShowAddrForm(false);
      setNewAddr({ label: "", fullName: "", phone: "", addressLine1: "", addressLine2: "", city: "", emirate: "Fujairah", isDefault: false });
      toast.success("Address saved!");
    } catch {
      toast.error("Failed to save address");
    }
  };

  const handleDeleteAddress = async (id: number) => {
    try {
      await deleteAddress.mutateAsync(id);
      await utils.addresses.list.invalidate();
      toast.success("Address removed");
    } catch {
      toast.error("Failed to delete address");
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container py-16 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#C9A84C] border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-[#3E1F00] text-white py-8">
        <div className="container">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold" style={{ fontFamily: "Playfair Display, serif" }}>My Account</h1>
              <p className="text-[#E8D5A3]/80 mt-1">Welcome back, {user?.name || "Customer"}!</p>
            </div>
            <Button variant="outline" onClick={() => logout()} className="border-[#E8D5A3] text-[#E8D5A3] hover:bg-[#E8D5A3]/10 bg-transparent">
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-8">
        <Tabs defaultValue="orders">
          <TabsList className="bg-white border border-[#E8D5A3] mb-6 h-auto p-1 gap-1">
            <TabsTrigger value="orders" className="data-[state=active]:bg-[#C9A84C] data-[state=active]:text-white gap-2">
              <Package className="h-4 w-4" /> Orders
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-[#C9A84C] data-[state=active]:text-white gap-2">
              <User className="h-4 w-4" /> Profile
            </TabsTrigger>
            <TabsTrigger value="addresses" className="data-[state=active]:bg-[#C9A84C] data-[state=active]:text-white gap-2">
              <MapPin className="h-4 w-4" /> Addresses
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders">
            {ordersLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-[#C9A84C] border-t-transparent rounded-full" />
              </div>
            ) : !orders || orders.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-[#E8D5A3]">
                <Package className="h-12 w-12 text-[#C9A84C] mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-[#3E1F00] mb-2">No orders yet</h3>
                <p className="text-muted-foreground mb-4">Start shopping and your orders will appear here</p>
                <Button asChild className="bg-[#C9A84C] hover:bg-[#9A7A2E] text-white">
                  <Link href="/shop">Browse Products</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="bg-white rounded-xl border border-[#E8D5A3] overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 bg-[#F5ECD7]">
                      <div>
                        <p className="font-bold text-[#3E1F00]">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={STATUS_COLORS[order.status] || "bg-gray-100 text-gray-700"}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Badge>
                        <span className="font-bold text-[#3E1F00]">AED {Number(order.total).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="px-5 py-3">
                      <div className="flex flex-wrap gap-2">
                        {order.items?.slice(0, 3).map((item: { id: number; productNameEn: string; quantity: number; productImage?: string | null }) => (
                          <div key={item.id} className="flex items-center gap-2 text-sm">
                            <div className="w-8 h-8 rounded bg-[#F5ECD7] overflow-hidden shrink-0">
                              {item.productImage ? (
                                <img src={item.productImage} alt={item.productNameEn} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-sm">🍬</div>
                              )}
                            </div>
                            <span className="text-[#3E1F00] truncate max-w-32">{item.productNameEn} ×{item.quantity}</span>
                          </div>
                        ))}
                        {(order.items?.length || 0) > 3 && (
                          <span className="text-sm text-muted-foreground">+{(order.items?.length || 0) - 3} more</span>
                        )}
                      </div>
                      <div className="mt-2">
                        <Link href={`/order-confirmation/${order.orderNumber}`} className="text-sm text-[#C9A84C] hover:underline">
                          View Order Details →
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="bg-white rounded-xl border border-[#E8D5A3] p-6 max-w-lg">
              <h2 className="text-xl font-bold text-[#3E1F00] mb-6">Personal Information</h2>
              <div className="space-y-4">
                <div>
                  <Label>Full Name</Label>
                  <Input
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="mt-1 border-[#E8D5A3] focus:border-[#C9A84C]"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="mt-1 border-[#E8D5A3] focus:border-[#C9A84C]"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={user?.phone || ""}
                    disabled
                    className="mt-1 bg-[#F5ECD7] border-[#E8D5A3]"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Phone number cannot be changed</p>
                </div>
                <Button
                  onClick={handleProfileSave}
                  disabled={updateProfile.isPending}
                  className="bg-[#C9A84C] hover:bg-[#9A7A2E] text-white"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses">
            <div className="space-y-4">
              {addrLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-4 border-[#C9A84C] border-t-transparent rounded-full" />
                </div>
              ) : (
                addresses?.map((addr) => (
                  <div key={addr.id} className="bg-white rounded-xl border border-[#E8D5A3] p-4 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-[#3E1F00]">{addr.label || addr.fullName}</p>
                        {addr.isDefault && <Badge className="bg-[#C9A84C] text-white text-xs">Default</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{addr.fullName}</p>
                      <p className="text-sm text-muted-foreground">{addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ""}</p>
                      <p className="text-sm text-muted-foreground">{addr.city ? `${addr.city}, ` : ""}{addr.emirate}</p>
                      <p className="text-sm text-muted-foreground">{addr.phone}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteAddress(addr.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}

              {!showAddrForm ? (
                <Button
                  variant="outline"
                  onClick={() => setShowAddrForm(true)}
                  className="border-dashed border-[#C9A84C] text-[#C9A84C] hover:bg-[#F5ECD7] w-full"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add New Address
                </Button>
              ) : (
                <form onSubmit={handleAddressSubmit} className="bg-white rounded-xl border border-[#E8D5A3] p-5">
                  <h3 className="font-semibold text-[#3E1F00] mb-4">New Address</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Label (e.g., Home, Work)</Label>
                      <Input value={newAddr.label} onChange={(e) => setNewAddr({ ...newAddr, label: e.target.value })} className="mt-1 border-[#E8D5A3]" placeholder="Home" />
                    </div>
                    <div>
                      <Label>Full Name *</Label>
                      <Input value={newAddr.fullName} onChange={(e) => setNewAddr({ ...newAddr, fullName: e.target.value })} className="mt-1 border-[#E8D5A3]" required />
                    </div>
                    <div>
                      <Label>Phone *</Label>
                      <Input value={newAddr.phone} onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })} className="mt-1 border-[#E8D5A3]" required />
                    </div>
                    <div>
                      <Label>Emirate *</Label>
                      <Input value={newAddr.emirate} onChange={(e) => setNewAddr({ ...newAddr, emirate: e.target.value })} className="mt-1 border-[#E8D5A3]" required />
                    </div>
                    <div className="col-span-2">
                      <Label>Address Line 1 *</Label>
                      <Input value={newAddr.addressLine1} onChange={(e) => setNewAddr({ ...newAddr, addressLine1: e.target.value })} className="mt-1 border-[#E8D5A3]" required />
                    </div>
                    <div className="col-span-2">
                      <Label>City</Label>
                      <Input value={newAddr.city} onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })} className="mt-1 border-[#E8D5A3]" />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <Button type="submit" disabled={upsertAddress.isPending} className="bg-[#C9A84C] hover:bg-[#9A7A2E] text-white">
                      Save Address
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowAddrForm(false)} className="border-[#C9A84C] text-[#C9A84C]">
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
