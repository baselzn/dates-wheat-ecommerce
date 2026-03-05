import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Gift, ArrowLeft, TrendingUp, ShoppingBag, Award } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

const TX_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  earn_order: { label: "Order Reward", color: "text-green-600" },
  earn_review: { label: "Review Reward", color: "text-green-600" },
  earn_referral: { label: "Referral Bonus", color: "text-green-600" },
  earn_signup: { label: "Welcome Bonus", color: "text-green-600" },
  redeem: { label: "Redeemed", color: "text-red-500" },
  expire: { label: "Expired", color: "text-muted-foreground" },
  adjust: { label: "Adjustment", color: "text-blue-600" },
};

export default function LoyaltyPointsPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const { data: balance, isLoading: balanceLoading } = trpc.ecommerce.loyalty.balance.useQuery(
    undefined,
    { enabled: !!user }
  );

  const { data: history, isLoading: historyLoading } = trpc.ecommerce.loyalty.history.useQuery(
    undefined,
    { enabled: !!user }
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Star className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Sign in to view your points</h2>
          <p className="text-muted-foreground mb-6">Earn points with every purchase and redeem them for discounts.</p>
          <Button onClick={() => navigate("/auth")}>Sign In</Button>
        </div>
      </div>
    );
  }

  const points = balance?.balance ?? 0;
  const tier = points >= 5000 ? "Gold" : points >= 1000 ? "Silver" : "Bronze";
  const tierColor = tier === "Gold" ? "text-yellow-600 bg-yellow-50" : tier === "Silver" ? "text-gray-600 bg-gray-50" : "text-amber-700 bg-amber-50";
  const nextTierPoints = tier === "Bronze" ? 1000 : tier === "Silver" ? 5000 : null;
  const progressPct = nextTierPoints ? Math.min(100, (points / nextTierPoints) * 100) : 100;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate("/account")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
              Loyalty Points
            </h1>
            <p className="text-sm text-muted-foreground">Earn points, unlock rewards</p>
          </div>
        </div>

        {/* Balance Card */}
        <Card className="mb-6 overflow-hidden">
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white/80 text-sm">Your Points Balance</p>
                <p className="text-4xl font-bold mt-1">
                  {balanceLoading ? "—" : points.toLocaleString()}
                </p>
                <p className="text-white/80 text-sm mt-1">≈ {(points * 0.01).toFixed(2)} AED value</p>
              </div>
              <Award className="w-16 h-16 text-white/30" />
            </div>
            <Badge className={`${tierColor} border-0 font-semibold`}>
              {tier} Member
            </Badge>
          </div>
          {nextTierPoints && (
            <CardContent className="pt-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{points.toLocaleString()} pts</span>
                <span>{nextTierPoints.toLocaleString()} pts for {tier === "Bronze" ? "Silver" : "Gold"}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-amber-400 to-orange-500 h-2 rounded-full transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {(nextTierPoints - points).toLocaleString()} more points to reach {tier === "Bronze" ? "Silver" : "Gold"}
              </p>
            </CardContent>
          )}
        </Card>

        {/* How to Earn */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              How to Earn Points
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { icon: ShoppingBag, label: "Every purchase", desc: "Earn 1 point per AED spent", color: "text-blue-500" },
              { icon: Star, label: "Write a review", desc: "+50 points per approved review", color: "text-yellow-500" },
              { icon: Gift, label: "Refer a friend", desc: "+200 points when they place their first order", color: "text-green-500" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0`}>
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                </div>
                <div>
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* How to Redeem */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="w-4 h-4 text-primary" />
              Redeeming Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              At checkout, you can apply your points as a discount. Every <strong>100 points = 1 AED</strong> off your order. Minimum redemption is 500 points.
            </p>
            <Button className="mt-4 w-full gap-2" onClick={() => navigate("/shop")}>
              <ShoppingBag className="w-4 h-4" />
              Shop & Earn Points
            </Button>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Points History</CardTitle>
          </CardHeader>
          <CardContent>
            {historyLoading && (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                ))}
              </div>
            )}
            {!historyLoading && (!history || history.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <Star className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No transactions yet. Start shopping to earn points!</p>
              </div>
            )}
            {!historyLoading && history && history.length > 0 && (
              <div className="space-y-3">
                {history.map((tx: {
                  id: number;
                  type: string;
                  points: number;
                  description: string | null;
                  createdAt: Date | string;
                }) => {
                  const meta = TX_TYPE_LABELS[tx.type] ?? { label: tx.type, color: "text-foreground" };
                  const isPositive = tx.points > 0;
                  return (
                    <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium text-sm">{meta.label}</p>
                        {tx.description && (
                          <p className="text-xs text-muted-foreground">{tx.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`font-bold text-sm ${isPositive ? "text-green-600" : "text-red-500"}`}>
                        {isPositive ? "+" : ""}{tx.points.toLocaleString()} pts
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
