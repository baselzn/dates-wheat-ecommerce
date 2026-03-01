import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { BookOpen, Edit, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";
const ACCOUNT_TYPES: AccountType[] = ["asset", "liability", "equity", "revenue", "expense"];

const TYPE_COLORS: Record<string, string> = {
  asset: "border-blue-400 text-blue-700",
  liability: "border-red-400 text-red-700",
  equity: "border-purple-400 text-purple-700",
  revenue: "border-green-400 text-green-700",
  expense: "border-orange-400 text-orange-700",
};

type AccountForm = {
  id?: number; code: string; name: string; nameAr: string;
  type: AccountType; parentId: string; isActive: boolean;
};
const emptyForm = (): AccountForm => ({ code: "", name: "", nameAr: "", type: "asset", parentId: "", isActive: true });

export default function ChartOfAccounts() {
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<AccountForm>(emptyForm());

  const { data: accounts = [], isLoading, refetch } = trpc.accounting.accounts.list.useQuery();

  const upsertMutation = trpc.accounting.accounts.upsert.useMutation({
    onSuccess: () => {
      toast.success(form.id ? "Account updated" : "Account created");
      setShowDialog(false);
      setForm(emptyForm());
      refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (a: any) => {
    setForm({
      id: a.id, code: a.code, name: a.name, nameAr: a.nameAr || "",
      type: a.type, parentId: a.parentId ? String(a.parentId) : "", isActive: a.isActive,
    });
    setShowDialog(true);
  };

  // Group by type
  const grouped = ACCOUNT_TYPES.reduce((acc, type) => {
    acc[type] = (accounts as any[]).filter((a: any) => a.type === type);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" /> Chart of Accounts
              </CardTitle>
              <Button onClick={() => { setForm(emptyForm()); setShowDialog(true); }} className="bg-[#C9A84C] hover:bg-[#b8943e]">
                <Plus className="h-4 w-4 mr-2" /> New Account
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (accounts as any[]).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p>No accounts yet. Create your chart of accounts to start recording transactions.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {ACCOUNT_TYPES.map(type => {
                  const typeAccounts = grouped[type];
                  if (typeAccounts.length === 0) return null;
                  return (
                    <div key={type}>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-2">
                        <Badge variant="outline" className={TYPE_COLORS[type]}>{type}</Badge>
                        <span className="text-xs">({typeAccounts.length} accounts)</span>
                      </h3>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Code</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Arabic Name</TableHead>
                              <TableHead className="text-right">Balance</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {typeAccounts.map((a: any) => (
                              <TableRow key={a.id}>
                                <TableCell><code className="text-xs bg-muted px-1 py-0.5 rounded">{a.code}</code></TableCell>
                                <TableCell className="font-medium">{a.name}</TableCell>
                                <TableCell className="text-sm text-muted-foreground" dir="rtl">{a.nameAr || "—"}</TableCell>
                                <TableCell className="text-right font-mono text-sm">
                                  AED {parseFloat(a.balance ?? "0").toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={a.isActive ? "border-green-400 text-green-700" : "border-gray-300 text-gray-500"}>
                                    {a.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Edit className="h-4 w-4" /></Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? "Edit" : "New"} Account</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Account Code *</Label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. 1000" />
              </div>
              <div>
                <Label>Type *</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as AccountType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Account Name (English) *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Cash and Cash Equivalents" />
            </div>
            <div>
              <Label>Account Name (Arabic)</Label>
              <Input value={form.nameAr} onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))} placeholder="e.g. النقد وما في حكمه" dir="rtl" />
            </div>
            <div>
              <Label>Parent Account</Label>
              <Select value={form.parentId} onValueChange={v => setForm(f => ({ ...f, parentId: v }))}>
                <SelectTrigger><SelectValue placeholder="None (top-level)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None (top-level)</SelectItem>
                  {(accounts as any[]).filter((a: any) => a.id !== form.id).map((a: any) => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.code} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button
              onClick={() => upsertMutation.mutate({
                id: form.id,
                code: form.code,
                name: form.name,
                nameAr: form.nameAr || undefined,
                type: form.type,
                parentId: form.parentId ? parseInt(form.parentId) : undefined,
                isActive: form.isActive,
              })}
              disabled={upsertMutation.isPending}
              className="bg-[#C9A84C] hover:bg-[#b8943e]"
            >
              {upsertMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
