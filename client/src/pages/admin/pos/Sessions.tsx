import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Plus, Receipt, Terminal, XCircle } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  open: "border-green-400 text-green-700 bg-green-50",
  closed: "border-gray-400 text-gray-600 bg-gray-50",
  suspended: "border-amber-400 text-amber-700 bg-amber-50",
};

export default function POSSessions() {
  const [, navigate] = useLocation();

  // Open session state
  const [showOpen, setShowOpen] = useState(false);
  const [openingCash, setOpeningCash] = useState("0");
  const [warehouseId, setWarehouseId] = useState("");

  // Close session state
  const [showClose, setShowClose] = useState(false);
  const [closingSessionId, setClosingSessionId] = useState<number | null>(null);
  const [closingCash, setClosingCash] = useState("");
  const [notes, setNotes] = useState("");

  const { data: sessions = [], isLoading, refetch } = trpc.pos.sessions.list.useQuery({ limit: 50 });
  const { data: warehouses = [] } = trpc.inventory.warehouses.list.useQuery();

  const openMutation = trpc.pos.sessions.open.useMutation({
    onSuccess: (data) => {
      toast.success(`Session ${data.sessionNumber} opened! Redirecting to terminal…`);
      setShowOpen(false);
      setOpeningCash("0");
      setWarehouseId("");
      refetch();
      // Redirect to POS terminal after opening session
      setTimeout(() => navigate("/admin/pos/terminal"), 800);
    },
    onError: (e) => toast.error(e.message),
  });

  const closeMutation = trpc.pos.sessions.close.useMutation({
    onSuccess: () => {
      toast.success("Session closed successfully");
      setShowClose(false);
      setClosingCash("");
      setNotes("");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleOpen = () => {
    if (!warehouseId) {
      toast.error("Please select a warehouse");
      return;
    }
    openMutation.mutate({
      warehouseId: parseInt(warehouseId),
      openingCash: openingCash || "0",
    });
  };

  const openCloseDialog = (session: any) => {
    setClosingSessionId(session.id);
    setClosingCash(session.expectedCash ?? "0");
    setShowClose(true);
  };

  const hasOpenSession = sessions.some((s: any) => s.status === "open");

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5">
              <p className="text-sm text-muted-foreground">Total Sessions</p>
              <p className="text-2xl font-bold text-[#3E1F00]">{sessions.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-sm text-muted-foreground">Open Sessions</p>
              <p className="text-2xl font-bold text-green-600">{sessions.filter((s: any) => s.status === "open").length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-sm text-muted-foreground">Total Sales (All Sessions)</p>
              <p className="text-2xl font-bold text-[#C9A84C]">
                AED {sessions.reduce((sum: number, s: any) => sum + parseFloat(s.totalSales ?? "0"), 0).toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" /> POS Sessions
              </CardTitle>
              <div className="flex gap-2">
                {hasOpenSession && (
                  <Button
                    variant="outline"
                    onClick={() => navigate("/admin/pos/terminal")}
                    className="border-green-400 text-green-700 hover:bg-green-50"
                  >
                    <Terminal className="h-4 w-4 mr-2" /> Go to Terminal
                  </Button>
                )}
                <Button
                  onClick={() => setShowOpen(true)}
                  className="bg-[#C9A84C] hover:bg-[#b8943e]"
                  disabled={hasOpenSession}
                  title={hasOpenSession ? "You already have an open session" : "Open a new POS session"}
                >
                  <Plus className="h-4 w-4 mr-2" /> Open New Session
                </Button>
              </div>
            </div>
            {hasOpenSession && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-2">
                You have an active session. Close it before opening a new one, or go to the terminal to continue selling.
              </p>
            )}
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session #</TableHead>
                    <TableHead>Cashier</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Opened</TableHead>
                    <TableHead>Closed</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Total Sales</TableHead>
                    <TableHead className="text-right">Opening Cash</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Loading sessions…</TableCell>
                    </TableRow>
                  ) : sessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12">
                        <div className="flex flex-col items-center gap-3">
                          <Receipt className="h-10 w-10 text-muted-foreground/40" />
                          <p className="text-muted-foreground font-medium">No sessions yet</p>
                          <p className="text-sm text-muted-foreground">Click "Open New Session" above to start your first POS session.</p>
                          <Button onClick={() => setShowOpen(true)} className="bg-[#C9A84C] hover:bg-[#b8943e] mt-2">
                            <Plus className="h-4 w-4 mr-2" /> Open First Session
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : sessions.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{s.sessionNumber}</code>
                      </TableCell>
                      <TableCell className="font-medium">{s.cashierName || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.warehouseName || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(s.openedAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {s.closedAt ? new Date(s.closedAt).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono">{s.totalOrders ?? 0}</TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        AED {parseFloat(s.totalSales ?? "0").toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        AED {parseFloat(s.openingCash ?? "0").toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_COLORS[s.status] || ""}>
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {s.status === "open" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 border-green-300 text-green-700"
                                onClick={() => navigate("/admin/pos/terminal")}
                              >
                                <Terminal className="h-3 w-3 mr-1" /> Terminal
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 border-red-300 text-red-600"
                                onClick={() => openCloseDialog(s)}
                              >
                                <XCircle className="h-3 w-3 mr-1" /> Close
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Open Session Dialog */}
      <Dialog open={showOpen} onOpenChange={setShowOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-[#C9A84C]" /> Open POS Session
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Warehouse <span className="text-red-500">*</span></Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a warehouse…" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.length === 0 ? (
                    <SelectItem value="_none" disabled>No warehouses — add one first</SelectItem>
                  ) : (
                    warehouses.map((w: any) => (
                      <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {warehouses.length === 0 && (
                <p className="text-xs text-amber-700 mt-1">
                  No warehouses found. Go to Inventory → Warehouses to create one first.
                </p>
              )}
            </div>
            <div>
              <Label>Opening Cash (AED)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={openingCash}
                onChange={e => setOpeningCash(e.target.value)}
                placeholder="0.00"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Enter the amount of cash in the drawer at session start.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpen(false)}>Cancel</Button>
            <Button
              onClick={handleOpen}
              disabled={openMutation.isPending || !warehouseId}
              className="bg-[#C9A84C] hover:bg-[#b8943e]"
            >
              {openMutation.isPending ? "Opening…" : "Open Session & Go to Terminal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Session Dialog */}
      <Dialog open={showClose} onOpenChange={setShowClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" /> Close POS Session
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Actual Closing Cash (AED)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={closingCash}
                onChange={e => setClosingCash(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Optional closing notes…"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClose(false)}>Cancel</Button>
            <Button
              onClick={() => closingSessionId && closeMutation.mutate({ id: closingSessionId, closingCash, notes: notes || undefined })}
              disabled={closeMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {closeMutation.isPending ? "Closing…" : "Close Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
