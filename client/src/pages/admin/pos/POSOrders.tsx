import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Eye, ShoppingCart } from "lucide-react";
import { useState } from "react";

export default function POSOrders() {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const { data: orders = [], isLoading } = trpc.pos.orders.list.useQuery({ limit: 100 });
  const { data: orderDetail } = trpc.pos.orders.getById.useQuery(
    { id: selectedOrder?.id },
    { enabled: !!selectedOrder?.id }
  );

  const paymentBadge = (method: string) => {
    const colors: Record<string, string> = {
      cash: "border-green-400 text-green-700",
      card: "border-blue-400 text-blue-700",
      bank_transfer: "border-purple-400 text-purple-700",
    };
    return colors[method] || "border-gray-400 text-gray-600";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" /> POS Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Cashier</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : orders.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No POS orders yet</TableCell></TableRow>
                  ) : orders.map((o: any) => (
                    <TableRow key={o.id}>
                      <TableCell><code className="text-xs bg-muted px-1 py-0.5 rounded">{o.orderNumber}</code></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</TableCell>
                      <TableCell className="text-sm">{o.customerName || "Walk-in"}</TableCell>
                      <TableCell className="text-sm">{o.cashierName || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={paymentBadge(o.paymentMethod)}>
                          {o.paymentMethod?.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        AED {parseFloat(o.totalAmount ?? "0").toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={o.status === "completed" ? "border-green-400 text-green-700" : "border-red-400 text-red-600"}>
                          {o.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(o)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order #{selectedOrder?.orderNumber}</DialogTitle>
          </DialogHeader>
          {orderDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Date:</span> {new Date(orderDetail.createdAt).toLocaleString()}</div>
                <div><span className="text-muted-foreground">Payment:</span> {orderDetail.paymentMethod?.replace(/_/g, " ")}</div>
                <div><span className="text-muted-foreground">Customer:</span> {orderDetail.customerName || "Walk-in"}</div>
                <div><span className="text-muted-foreground">Phone:</span> {orderDetail.customerPhone || "—"}</div>
              </div>

              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(orderDetail as any).items?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm">{item.productName}</TableCell>
                        <TableCell className="text-right text-sm">{parseFloat(item.qty).toFixed(0)}</TableCell>
                        <TableCell className="text-right text-sm font-mono">AED {parseFloat(item.unitPrice).toFixed(2)}</TableCell>
                        <TableCell className="text-right text-sm font-mono">AED {parseFloat(item.totalPrice).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="bg-[#F5ECD7] rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>AED {parseFloat(orderDetail.subtotal ?? "0").toFixed(2)}</span></div>
                {parseFloat(orderDetail.discountAmount ?? "0") > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-red-600">- AED {parseFloat(orderDetail.discountAmount).toFixed(2)}</span></div>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">VAT (5%)</span><span>AED {parseFloat(orderDetail.vatAmount ?? "0").toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-[#3E1F00]"><span>Total</span><span>AED {parseFloat((orderDetail as any).grandTotal ?? (orderDetail as any).totalAmount ?? "0").toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Amount Paid</span><span>AED {parseFloat(orderDetail.amountPaid ?? "0").toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Change</span><span>AED {parseFloat((orderDetail as any).changeGiven ?? (orderDetail as any).changeAmount ?? "0").toFixed(2)}</span></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
