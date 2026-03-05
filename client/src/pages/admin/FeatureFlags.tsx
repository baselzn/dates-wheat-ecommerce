import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Heart, Zap, Star, Gift, Search, Package, MessageCircle,
  Users, BarChart2, RefreshCw, Layers, Tag, ShoppingBag, Bell
} from "lucide-react";

const FEATURE_DEFINITIONS = [
  {
    key: "wishlist",
    label: "Wishlist",
    labelAr: "قائمة الأمنيات",
    description: "Allow customers to save products to a personal wishlist.",
    icon: Heart,
    category: "Shopping",
  },
  {
    key: "flash_sales",
    label: "Flash Sales",
    labelAr: "عروض مؤقتة",
    description: "Enable time-limited flash sale banners and discounted product listings.",
    icon: Zap,
    category: "Promotions",
  },
  {
    key: "product_reviews",
    label: "Product Reviews",
    labelAr: "تقييمات المنتجات",
    description: "Let customers submit star ratings and written reviews for products.",
    icon: Star,
    category: "Social",
  },
  {
    key: "loyalty_points",
    label: "Loyalty Points",
    labelAr: "نقاط الولاء",
    description: "Reward customers with points for purchases, reviews, and referrals.",
    icon: Gift,
    category: "Retention",
  },
  {
    key: "product_search",
    label: "Advanced Search",
    labelAr: "البحث المتقدم",
    description: "Full-text product search with filters for category, price, and rating.",
    icon: Search,
    category: "Discovery",
  },
  {
    key: "order_tracking",
    label: "Order Tracking",
    labelAr: "تتبع الطلبات",
    description: "Show customers real-time order status and delivery timeline.",
    icon: Package,
    category: "Orders",
  },
  {
    key: "product_qa",
    label: "Product Q&A",
    labelAr: "أسئلة وأجوبة المنتجات",
    description: "Allow customers to ask questions on product pages, answered by the team.",
    icon: MessageCircle,
    category: "Social",
  },
  {
    key: "referral_program",
    label: "Referral Program",
    labelAr: "برنامج الإحالة",
    description: "Give customers a unique referral code to share and earn bonus points.",
    icon: Users,
    category: "Retention",
  },
  {
    key: "product_bundles",
    label: "Product Bundles",
    labelAr: "حزم المنتجات",
    description: "Create bundled product sets sold at a discounted bundle price.",
    icon: Layers,
    category: "Promotions",
  },
  {
    key: "abandoned_cart",
    label: "Abandoned Cart Recovery",
    labelAr: "استرداد سلة التسوق المهجورة",
    description: "Track and recover abandoned shopping carts with follow-up notifications.",
    icon: ShoppingBag,
    category: "Retention",
  },
  {
    key: "recently_viewed",
    label: "Recently Viewed Products",
    labelAr: "المنتجات المشاهدة مؤخراً",
    description: "Show a personalized recently-viewed products section on the homepage and product pages.",
    icon: RefreshCw,
    category: "Discovery",
  },
  {
    key: "push_notifications",
    label: "Push Notifications",
    labelAr: "إشعارات الدفع",
    description: "Send web push notifications for order updates, flash sales, and promotions.",
    icon: Bell,
    category: "Engagement",
  },
  {
    key: "discount_rules",
    label: "Automatic Discount Rules",
    labelAr: "قواعد الخصم التلقائية",
    description: "Apply automatic discounts based on cart value, quantity, or customer tier.",
    icon: Tag,
    category: "Promotions",
  },
  {
    key: "analytics",
    label: "Advanced Analytics",
    labelAr: "التحليلات المتقدمة",
    description: "Detailed sales analytics, conversion funnels, and customer insights.",
    icon: BarChart2,
    category: "Insights",
  },
];

const CATEGORIES = ["All", "Shopping", "Promotions", "Social", "Retention", "Discovery", "Orders", "Engagement", "Insights"];

export default function AdminFeatureFlags() {
  const [selectedCategory, setSelectedCategory] = useState("All");

  const { data: flags, isLoading, refetch } = trpc.ecommerce.featureFlags.list.useQuery();

  const toggleMutation = trpc.ecommerce.featureFlags.toggle.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update feature flag");
    },
  });

  const getFlagState = (key: string): boolean => {
    if (!flags) return true; // default enabled
    const flag = flags.find((f) => f.feature === key);
    return flag ? flag.isEnabled : true;
  };

  const handleToggle = (key: string, newValue: boolean) => {
    toggleMutation.mutate({ feature: key, isEnabled: newValue });
    toast.success(`${newValue ? "Enabled" : "Disabled"} ${key.replace(/_/g, " ")}`);
  };

  const filteredFeatures = FEATURE_DEFINITIONS.filter(
    (f) => selectedCategory === "All" || f.category === selectedCategory
  );

  const enabledCount = FEATURE_DEFINITIONS.filter((f) => getFlagState(f.key)).length;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Feature Flags</h1>
          <p className="text-muted-foreground mt-1">
            Enable or disable e-commerce features for your store. Changes take effect immediately.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-green-600">{enabledCount}</div>
              <div className="text-xs text-muted-foreground">Features Enabled</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-muted-foreground">{FEATURE_DEFINITIONS.length - enabledCount}</div>
              <div className="text-xs text-muted-foreground">Features Disabled</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold">{FEATURE_DEFINITIONS.length}</div>
              <div className="text-xs text-muted-foreground">Total Features</div>
            </CardContent>
          </Card>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 flex-wrap mb-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Feature List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFeatures.map((feature) => {
              const isEnabled = getFlagState(feature.key);
              const Icon = feature.icon;
              return (
                <Card key={feature.key} className={`transition-all ${isEnabled ? "" : "opacity-70"}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        isEnabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium text-sm">{feature.label}</span>
                          <span className="text-xs text-muted-foreground font-arabic">{feature.labelAr}</span>
                          <Badge
                            variant="outline"
                            className="text-xs px-1.5 py-0 h-5"
                          >
                            {feature.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{feature.description}</p>
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(val) => handleToggle(feature.key, val)}
                        disabled={toggleMutation.isPending}
                        className="shrink-0"
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
