import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Eye, FileText, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type JELine = { accountId: string; debit: string; credit: string; description: string };

export default function JournalEntries() {
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [lines, setLines] = useState<JELine[]>([
    { accountId: "", debit: "", credit: "", description: "" },
    { accountId: "", debit: "", credit: "", description: "" },
  ]);

  const { data: entries = [], isLoading, refetch } = trpc.accounting.journal.list.useQuery({ limit: 100 });
  const { data: accounts = [] } = trpc.accounting.accounts.list.useQuery();
  const { data: detail } = trpc.accounting.journal.getById.useQuery({ id: showDetail! }, { enabled: !!showDetail });

  const createMutation = trpc.accounting.journal.create.useMutation({
    onSuccess: () => {
      toast.success("Journal entry created");
      setShowCreate(false);
      setDescription(""); setEntryDate(new Date().toISOString().split("T")[0]);
      setLines([{ accountId: "", debit: "", credit: "", description: "" }, { accountId: "", debit: "", credit: "", description: "" }]);
      refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addLine = () => setLines(prev => [...prev, { accountId: "", debit: "", credit: "", description: "" }]);
  const removeLine = (i: number) => setLines(prev => prev.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof JELine, val: string) =>
    setLines(prev => prev.map((line, idx) => idx === i ? { ...line, [field]: val } : line));

  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleCreate = () => {
    if (!description) { toast.error("Description is required"); return; }
    const validLines = lines.filter(l => l.accountId && (l.debit || l.credit));
    if (validLines.length < 2) { toast.error("At least 2 lines are required"); return; }
    if (!isBalanced) { toast.error("Debits must equal credits"); return; }
    createMutation.mutate({
      description,
      date: entryDate,
      lines: validLines.map(l => ({
        accountId: parseInt(l.accountId),
        debit: l.debit || "0",
        credit: l.credit || "0",
        description: l.description || undefined,
      })),
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" /> Journal Entries
              </CardTitle>
              <Button onClick={() => setShowCreate(true)} className="bg-[#C9A84C] hover:bg-[#b8943e]">
                <Plus className="h-4 w-4 mr-2" /> New Entry
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Total Debit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : entries.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No journal entries yet</TableCell></TableRow>
                  ) : entries.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell><code className="text-xs bg-muted px-1 py-0.5 rounded">{e.referenceNumber}</code></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(e.entryDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm max-w-[250px] truncate">{e.description}</TableCell>
                      <TableCell className="text-right font-mono text-sm">AED {parseFloat(e.totalDebit ?? "0").toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={e.status === "posted" ? "border-green-400 text-green-700" : "border-amber-400 text-amber-700"}>
                          {e.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setShowDetail(e.id)}>
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

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>New Journal Entry</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Description *</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Monthly rent payment" />
              </div>
              <div>
                <Label>Entry Date</Label>
                <Input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Lines *</Label>
                <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-3 w-3 mr-1" /> Add Line</Button>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_100px_100px_auto] gap-2 text-xs text-muted-foreground px-1">
                  <span>Account</span><span className="text-right">Debit</span><span className="text-right">Credit</span><span></span>
                </div>
                {lines.map((line, i) => (
                  <div key={i} className="grid grid-cols-[1fr_100px_100px_auto] gap-2 items-center">
                    <Select value={line.accountId} onValueChange={v => updateLine(i, "accountId", v)}>
                      <SelectTrigger><SelectValue placeholder="Account" /></SelectTrigger>
                      <SelectContent>
                        {(accounts as any[]).map((a: any) => (
                          <SelectItem key={a.id} value={String(a.id)}>{a.code} — {a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input type="number" placeholder="0.00" value={line.debit}
                      onChange={e => { updateLine(i, "debit", e.target.value); if (e.target.value) updateLine(i, "credit", ""); }}
                      className="text-right" />
                    <Input type="number" placeholder="0.00" value={line.credit}
                      onChange={e => { updateLine(i, "credit", e.target.value); if (e.target.value) updateLine(i, "debit", ""); }}
                      className="text-right" />
                    <Button variant="ghost" size="icon" className="text-red-500 h-8 w-8" onClick={() => removeLine(i)} disabled={lines.length <= 2}>×</Button>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-[1fr_100px_100px_auto] gap-2 mt-2 pt-2 border-t">
                <div className="text-sm font-medium">Totals</div>
                <div className={`text-right font-mono text-sm font-bold ${!isBalanced ? "text-red-600" : "text-green-600"}`}>
                  {totalDebit.toFixed(2)}
                </div>
                <div className={`text-right font-mono text-sm font-bold ${!isBalanced ? "text-red-600" : "text-green-600"}`}>
                  {totalCredit.toFixed(2)}
                </div>
                <div></div>
              </div>
              {!isBalanced && totalDebit > 0 && (
                <p className="text-xs text-red-600 mt-1">⚠ Debits and credits must be equal. Difference: AED {Math.abs(totalDebit - totalCredit).toFixed(2)}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending || !isBalanced} className="bg-[#C9A84C] hover:bg-[#b8943e]">
              {createMutation.isPending ? "Saving..." : "Post Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Journal Entry Detail</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Reference:</span> <code className="text-xs bg-muted px-1 rounded">{detail.entryNumber}</code></div>
                <div><span className="text-muted-foreground">Date:</span> {new Date(detail.date).toLocaleDateString()}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Description:</span> {detail.description}</div>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(detail as any).lines?.map((line: any) => (
                      <TableRow key={line.id}>
                        <TableCell className="text-sm">{line.accountCode} — {line.accountName}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {parseFloat(line.debit) > 0 ? `AED ${parseFloat(line.debit).toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {parseFloat(line.credit) > 0 ? `AED ${parseFloat(line.credit).toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{line.description || "—"}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/30 font-bold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right font-mono">AED {((detail as any).lines ?? []).reduce((s: number, l: any) => s + parseFloat(l.debit || "0"), 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono">AED {((detail as any).lines ?? []).reduce((s: number, l: any) => s + parseFloat(l.credit || "0"), 0).toFixed(2)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
