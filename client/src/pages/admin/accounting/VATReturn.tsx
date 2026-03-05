import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Calculator } from "lucide-react";
import { exportToCsv } from "@/lib/csvExport";

const QUARTERS = [
  { label: "Q1 2025 (Jan–Mar)", start: "2025-01-01", end: "2025-03-31" },
  { label: "Q2 2025 (Apr–Jun)", start: "2025-04-01", end: "2025-06-30" },
  { label: "Q3 2025 (Jul–Sep)", start: "2025-07-01", end: "2025-09-30" },
  { label: "Q4 2025 (Oct–Dec)", start: "2025-10-01", end: "2025-12-31" },
  { label: "Q1 2026 (Jan–Mar)", start: "2026-01-01", end: "2026-03-31" },
  { label: "Q2 2026 (Apr–Jun)", start: "2026-04-01", end: "2026-06-30" },
];

export default function VATReturn() {
  const [quarter, setQuarter] = useState(QUARTERS[4]); // Default Q1 2026

  const { data: journalData, isLoading } = trpc.accounting.journal.list.useQuery({
    from: quarter.start,
    to: quarter.end,
    limit: 1000,
  });

  // Aggregate VAT from journal entries
  const entries = (Array.isArray(journalData) ? journalData : (journalData as any)?.entries ?? []) as any[];
  let outputVAT = 0;   // VAT collected on sales (credit to VAT Payable)
  let inputVAT = 0;    // VAT paid on purchases (debit from VAT Payable)
  let totalSales = 0;
  let totalPurchases = 0;

  for (const entry of entries) {
    for (const line of (entry.lines ?? [])) {
      const acctCode = line.accountCode ?? "";
      const amount = parseFloat(line.amount ?? "0");
      // Output VAT: credit to account 2200 (VAT Payable)
      if (acctCode === "2200" && line.type === "credit") {
        outputVAT += amount;
      }
      // Input VAT: debit to account 2200 (VAT refund/purchase VAT)
      if (acctCode === "2200" && line.type === "debit") {
        inputVAT += amount;
      }
      // Sales Revenue: credit to 4001
      if (acctCode === "4001" && line.type === "credit") {
        totalSales += amount;
      }
      // Purchases: debit to 5000-5999
      if (acctCode.startsWith("5") && line.type === "debit") {
        totalPurchases += amount;
      }
    }
  }

  const netVAT = outputVAT - inputVAT;
  const vatRate = totalSales > 0 ? (outputVAT / totalSales) * 100 : 0;

  const handleExport = () => {
    exportToCsv(
      `vat-return-${quarter.start.slice(0, 7)}.csv`,
      ["Field", "Value"],
      [
        ["Period", quarter.label],
        ["Total Sales (excl. VAT)", totalSales.toFixed(2)],
        ["Output VAT (collected)", outputVAT.toFixed(2)],
        ["Total Purchases", totalPurchases.toFixed(2)],
        ["Input VAT (paid)", inputVAT.toFixed(2)],
        ["Net VAT Payable", netVAT.toFixed(2)],
        ["Effective VAT Rate", `${vatRate.toFixed(2)}%`],
      ]
    );
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">VAT Return Preparation</h1>
            <p className="text-muted-foreground text-sm">Summarise output and input VAT for a filing period</p>
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={quarter.label}
              onValueChange={(v) => setQuarter(QUARTERS.find(q => q.label === v) ?? QUARTERS[4])}
            >
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUARTERS.map(q => (
                  <SelectItem key={q.label} value={q.label}>{q.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-[#C9A84C] border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: "Total Sales (excl. VAT)", value: totalSales, color: "text-green-600" },
                { label: "Output VAT Collected", value: outputVAT, color: "text-blue-600" },
                { label: "Total Purchases", value: totalPurchases, color: "text-muted-foreground" },
                { label: "Input VAT Paid", value: inputVAT, color: "text-orange-600" },
                { label: "Net VAT Payable", value: netVAT, color: netVAT >= 0 ? "text-red-600" : "text-green-600" },
                { label: "Effective VAT Rate", value: null, display: `${vatRate.toFixed(2)}%`, color: "text-muted-foreground" },
              ].map(item => (
                <Card key={item.label}>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                    <p className={`text-2xl font-bold ${item.color}`}>
                      {item.display ?? `SAR ${(item.value as number).toFixed(2)}`}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* VAT Return Form Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4" />
                  VAT Return Summary — {quarter.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-0 divide-y">
                  {[
                    { box: "Box 1", label: "Standard-rated sales", amount: totalSales, note: "Excl. VAT" },
                    { box: "Box 2", label: "Output VAT (5%)", amount: outputVAT, note: "VAT on sales" },
                    { box: "Box 3", label: "Total Output Tax", amount: outputVAT, note: "" },
                    { box: "Box 4", label: "Standard-rated purchases", amount: totalPurchases, note: "Excl. VAT" },
                    { box: "Box 5", label: "Input VAT reclaimable", amount: inputVAT, note: "VAT on purchases" },
                    { box: "Box 6", label: "Total Input Tax", amount: inputVAT, note: "" },
                  ].map(row => (
                    <div key={row.box} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono w-14 justify-center">{row.box}</Badge>
                        <div>
                          <p className="font-medium text-sm">{row.label}</p>
                          {row.note && <p className="text-xs text-muted-foreground">{row.note}</p>}
                        </div>
                      </div>
                      <p className="font-mono font-semibold">SAR {row.amount.toFixed(2)}</p>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-4 bg-muted/30 -mx-6 px-6 mt-2">
                    <div className="flex items-center gap-3">
                      <Calculator className="w-5 h-5 text-[#C9A84C]" />
                      <div>
                        <p className="font-bold">Net VAT Payable (Box 3 − Box 6)</p>
                        <p className="text-xs text-muted-foreground">
                          {netVAT >= 0 ? "Amount due to ZATCA" : "VAT refund due to you"}
                        </p>
                      </div>
                    </div>
                    <p className={`font-mono text-xl font-bold ${netVAT >= 0 ? "text-red-600" : "text-green-600"}`}>
                      SAR {Math.abs(netVAT).toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {entries.length === 0 && (
              <p className="text-center text-muted-foreground py-4 text-sm">
                No journal entries found for this period. Post orders as paid to generate accounting entries automatically.
              </p>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
