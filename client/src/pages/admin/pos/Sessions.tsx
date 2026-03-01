import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Receipt, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  open: "border-green-400 text-green-700 bg-green-50",
  closed: "border-gray-400 text-gray-600",
  suspended: "border-amber-400 text-amber-700",
};

export default function POSSessions() {
  const [showClose, setShowClose] = useState(false);
  const [closingSessionId, setClosingSessionId] = useState<number | null>(null);
  const [closingCash, setClosingCash] = useState("");
  const [notes, setNotes] = useState("");

  const { data: sessions = [], isLoading, refetch } = trpc.pos.sessions.list.useQuery({ limit: 50 });

  const closeMutation = trpc.pos.sessions.close.useMutation({
    onSuccess: () => {
      toast.success("Session closed");
      setShowClose(false);
      setClosingCash(""); setNotes("");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const openClose = (session: any) => {
    setClosingSessionId(session.id);
    setClosingCash(session.expectedCash ?? "0");
    setShowClose(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" /> POS Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session #</TableHead>
                    <TableHead>Cashier</TableHead>
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
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : sessions.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No sessions yet. Open the POS Terminal to start.</TableCell></TableRow>
                  ) : sessions.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell><code className="text-xs bg-muted px-1 py-0.5 rounded">{s.sessionNumber}</code></TableCell>
                      <TableCell>{s.cashierName || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(s.openedAt).toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.closedAt ? new Date(s.closedAt).toLocaleString() : "—"}</TableCell>
                      <TableCell className="text-right">{s.totalOrders ?? 0}</TableCell>
                      <TableCell className="text-right font-mono">AED {parseFloat(s.totalSales ?? "0").toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono">AED {parseFloat(s.openingCash ?? "0").toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_COLORS[s.status] || ""}>
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {s.status === "open" && (
                          <Button size="sm" variant="outline" className="text-xs h-7 border-red-300 text-red-600"
                            onClick={() => openClose(s)}>
                            <XCircle className="h-3 w-3 mr-1" /> Close
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showClose} onOpenChange={setShowClose}>
        <DialogContent>
          <DialogHeader><DialogTitle>Close POS Session</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Actual Closing Cash (AED)</Label>
              <Input type="number" value={closingCash} onChange={e => setClosingCash(e.target.value)} />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional closing notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClose(false)}>Cancel</Button>
            <Button
              onClick={() => closingSessionId && closeMutation.mutate({ id: closingSessionId, closingCash, notes: notes || undefined })}
              disabled={closeMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {closeMutation.isPending ? "Closing..." : "Close Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
