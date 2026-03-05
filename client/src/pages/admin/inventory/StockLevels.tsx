import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, Bell, Package, RefreshCw, Search, Warehouse } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function StockLevels() {
  const [search, setSearch] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all");

  const { data: warehouses = [] } = trpc.inventory.warehouses.list.useQuery();
  const { data: stockLevels = [], isLoading, refetch } = trpc.inventory.stockLevels.list.useQuery(
    warehouseFilter !== "all" ? { warehouseId: parseInt(warehouseFilter) } : undefined
  );
  const { data: lowStock = [] } = trpc.inventory.stockLevels.lowStock.useQuery();
  const checkAndNotify = trpc.inventory.alerts.checkAndNotify.useMutation({
    onSuccess: (data) => {
      if (data.sent) {
        toast.success(`Low stock alert sent for ${data.count} product${data.count > 1 ? "s" : ""}!`);
      } else {
        toast.info("All products are above their reorder points. No alert needed.");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = stockLevels.filter(s =>
    !search || s.productName?.toLowerCase().includes(search.toLowerCase()) || s.productSku?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg"><Package className="h-5 w-5 text-blue-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Total SKUs Tracked</p>
                  <p className="text-2xl font-bold">{stockLevels.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Low Stock Alerts</p>
                  <p className="text-2xl font-bold text-amber-600">{lowStock.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg"><Warehouse className="h-5 w-5 text-green-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Warehouses</p>
                  <p className="text-2xl font-bold">{warehouses.filter(w => w.isActive).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Alert */}
        {lowStock.length > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-amber-800 flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4" /> Low Stock Alert ({lowStock.length} items)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {lowStock.map(item => (
                  <Badge key={item.id} variant="outline" className="border-amber-400 text-amber-800 bg-white">
                    {item.productName} — {parseFloat(item.qty).toFixed(0)} / {parseFloat(item.reorderPoint).toFixed(0)} (reorder)
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Stock Levels</CardTitle>
              <div className="flex gap-2">
                {lowStock.length > 0 && (
                  <Button
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5"
                    disabled={checkAndNotify.isPending}
                    onClick={() => checkAndNotify.mutate()}
                  >
                    <Bell className="h-4 w-4" />
                    Notify Owner ({lowStock.length})
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search product name or SKU..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Warehouses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Warehouses</SelectItem>
                  {warehouses.map(w => (
                    <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead className="text-right">On Hand</TableHead>
                    <TableHead className="text-right">Reserved</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Reorder Point</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No stock records found</TableCell></TableRow>
                  ) : filtered.map(item => {
                    const qty = parseFloat(item.qty);
                    const reserved = parseFloat(item.reservedQty);
                    const available = qty - reserved;
                    const reorder = parseFloat(item.reorderPoint);
                    const isLow = qty <= reorder;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{item.productSku || "—"}</TableCell>
                        <TableCell>{item.warehouseName}</TableCell>
                        <TableCell className="text-right font-mono">{qty.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">{reserved.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">{available.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono">{reorder.toFixed(2)}</TableCell>
                        <TableCell>
                          {isLow ? (
                            <Badge variant="outline" className="border-red-400 text-red-600 bg-red-50">Low Stock</Badge>
                          ) : (
                            <Badge variant="outline" className="border-green-400 text-green-600 bg-green-50">OK</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
