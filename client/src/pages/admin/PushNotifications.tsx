import { useState } from "react";
import { Bell, Send, Users, CheckCircle, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

export default function PushNotifications() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/");
  const [lastResult, setLastResult] = useState<{ sent: number; failed: number; total: number } | null>(null);

  const { data: count, refetch: refetchCount } = trpc.push.count.useQuery();
  const sendMutation = trpc.push.send.useMutation({
    onSuccess: (data) => {
      setLastResult(data);
      refetchCount();
      toast.success(`Delivered to ${data.sent} of ${data.total} subscribers.`);
      setTitle("");
      setBody("");
      setUrl("/");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSend = () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and message are required.");
      return;
    }
    sendMutation.mutate({ title, body, url: url || "/" });
  };

  const quickTemplates = [
    { label: "New Arrival", title: "🌟 New Products Available!", body: "Discover our latest collection of premium dates and Arabic sweets." },
    { label: "Special Offer", title: "🎁 Exclusive Offer Just for You!", body: "Get 15% off your next order. Use code SWEET15 at checkout." },
    { label: "Order Update", title: "📦 Your Order is on the Way!", body: "Your Dates & Wheat order has been shipped and will arrive soon." },
    { label: "Ramadan", title: "🌙 Ramadan Kareem!", body: "Celebrate the holy month with our special Ramadan gift boxes." },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#3E1F00]" style={{ fontFamily: "Playfair Display, serif" }}>
          Push Notifications
        </h1>
        <p className="text-sm text-[#8B6914] mt-1">Broadcast messages to all subscribed customers</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-[#E8D5A3]">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F5ECD7] flex items-center justify-center">
                <Users className="w-5 h-5 text-[#8B6914]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#3E1F00]">{count ?? 0}</p>
                <p className="text-xs text-[#8B6914]">Active Subscribers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {lastResult && (
          <>
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-700">{lastResult.sent}</p>
                    <p className="text-xs text-green-600">Delivered</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{lastResult.failed}</p>
                    <p className="text-xs text-red-500">Failed / Expired</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Quick Templates */}
      <Card className="border-[#E8D5A3]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#3E1F00]">Quick Templates</CardTitle>
          <CardDescription className="text-xs">Click a template to pre-fill the form</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {quickTemplates.map((t) => (
              <button
                key={t.label}
                onClick={() => { setTitle(t.title); setBody(t.body); }}
                className="p-2.5 rounded-xl border border-[#E8D5A3] hover:border-[#C9A84C] hover:bg-[#FFF8F0] text-left transition-colors"
              >
                <p className="text-xs font-semibold text-[#3E1F00]">{t.label}</p>
                <p className="text-xs text-[#8B6914] mt-0.5 line-clamp-2">{t.title}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Compose Form */}
      <Card className="border-[#E8D5A3]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#3E1F00] flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#8B6914]" />
            Compose Notification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="notif-title" className="text-sm text-[#3E1F00]">Title</Label>
            <Input
              id="notif-title"
              placeholder="e.g. 🎁 Special Offer Just for You!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              className="border-[#E8D5A3] focus:border-[#C9A84C]"
            />
            <p className="text-xs text-[#8B6914] text-right">{title.length}/80</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notif-body" className="text-sm text-[#3E1F00]">Message</Label>
            <Textarea
              id="notif-body"
              placeholder="Write your notification message here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={200}
              rows={3}
              className="border-[#E8D5A3] focus:border-[#C9A84C] resize-none"
            />
            <p className="text-xs text-[#8B6914] text-right">{body.length}/200</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notif-url" className="text-sm text-[#3E1F00]">Link URL (optional)</Label>
            <Input
              id="notif-url"
              placeholder="/shop or /product/some-product"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="border-[#E8D5A3] focus:border-[#C9A84C]"
            />
          </div>

          {/* Preview */}
          {(title || body) && (
            <div className="rounded-xl border border-[#E8D5A3] bg-[#FFF8F0] p-3">
              <p className="text-xs text-[#8B6914] font-medium mb-2">Preview</p>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#c9a96e] to-[#8b6914] flex items-center justify-center flex-shrink-0">
                  <Bell className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#3E1F00]">{title || "Notification Title"}</p>
                  <p className="text-xs text-[#8B6914] mt-0.5 leading-relaxed">{body || "Notification message..."}</p>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handleSend}
            disabled={sendMutation.isPending || !title.trim() || !body.trim() || (count ?? 0) === 0}
            className="w-full bg-gradient-to-r from-[#c9a96e] to-[#8b6914] hover:opacity-90 text-white border-0 gap-2"
          >
            <Send className="w-4 h-4" />
            {sendMutation.isPending
              ? "Sending..."
              : `Send to ${count ?? 0} Subscriber${(count ?? 0) !== 1 ? "s" : ""}`}
          </Button>

          {(count ?? 0) === 0 && (
            <p className="text-xs text-center text-[#8B6914]/70">
              No subscribers yet. Customers will be prompted to subscribe when they visit the store.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
