import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { BarChart3 } from "lucide-react";
import { useState } from "react";

export default function AccountingReports() {
  const currentYear = new Date().getFullYear();
  const [fromDate, setFromDate] = useState(`${currentYear}-01-01`);
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [queryParams, setQueryParams] = useState({ from: `${currentYear}-01-01`, to: new Date().toISOString().split("T")[0] });

  const { data: pnl, isLoading: pnlLoading } = trpc.accounting.reports.profitAndLoss.useQuery(queryParams);
  const { data: balanceSheet, isLoading: bsLoading } = trpc.accounting.reports.balanceSheet.useQuery({ asOf: queryParams.to });

  const applyFilter = () => setQueryParams({ from: fromDate, to: toDate });

  const formatAED = (val: string | number | null | undefined) =>
    `AED ${parseFloat(String(val ?? "0")).toFixed(2)}`;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Date Filter */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-end gap-3">
              <div>
                <Label>From Date</Label>
                <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-40" />
              </div>
              <div>
                <Label>To Date</Label>
                <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-40" />
              </div>
              <Button onClick={applyFilter} className="bg-[#C9A84C] hover:bg-[#b8943e]">Apply</Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="pnl">
          <TabsList>
            <TabsTrigger value="pnl">Profit & Loss</TabsTrigger>
            <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
          </TabsList>

          {/* Profit & Loss */}
          <TabsContent value="pnl">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" /> Profit & Loss Statement
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {new Date(queryParams.from).toLocaleDateString()} — {new Date(queryParams.to).toLocaleDateString()}
                </p>
              </CardHeader>
              <CardContent>
                {pnlLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : !pnl ? (
                  <div className="text-center py-8 text-muted-foreground">No data available</div>
                ) : (
                  <div className="space-y-6 max-w-2xl">
                    {/* Revenue */}
                    <div>
                      <h3 className="font-semibold text-[#3E1F00] mb-2">Revenue</h3>
                      <div className="rounded-md border">
                        <Table>
                          <TableBody>
                            {(pnl as any).revenue?.map((item: any) => (
                              <TableRow key={item.accountId}>
                                <TableCell className="text-sm">{item.accountCode} — {item.accountName}</TableCell>
                                <TableCell className="text-right font-mono text-sm">{formatAED(item.amount)}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-green-50 font-bold">
                              <TableCell>Total Revenue</TableCell>
                              <TableCell className="text-right font-mono text-green-700">{formatAED((pnl as any).totalRevenue)}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    {/* Expenses */}
                    <div>
                      <h3 className="font-semibold text-[#3E1F00] mb-2">Expenses</h3>
                      <div className="rounded-md border">
                        <Table>
                          <TableBody>
                            {(pnl as any).expenses?.map((item: any) => (
                              <TableRow key={item.accountId}>
                                <TableCell className="text-sm">{item.accountCode} — {item.accountName}</TableCell>
                                <TableCell className="text-right font-mono text-sm">{formatAED(item.amount)}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-red-50 font-bold">
                              <TableCell>Total Expenses</TableCell>
                              <TableCell className="text-right font-mono text-red-700">{formatAED((pnl as any).totalExpenses)}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    <Separator />
                    <div className={`flex justify-between items-center text-lg font-bold p-4 rounded-lg ${parseFloat((pnl as any).netIncome ?? "0") >= 0 ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                      <span>Net Income</span>
                      <span>{formatAED((pnl as any).netIncome)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Balance Sheet */}
          <TabsContent value="balance">
            <Card>
              <CardHeader>
                <CardTitle>Balance Sheet</CardTitle>
                <p className="text-sm text-muted-foreground">As of {new Date(queryParams.to).toLocaleDateString()}</p>
              </CardHeader>
              <CardContent>
                {bsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : !balanceSheet ? (
                  <div className="text-center py-8 text-muted-foreground">No data available</div>
                ) : (
                  <div className="grid grid-cols-2 gap-6 max-w-4xl">
                    {/* Assets */}
                    <div>
                      <h3 className="font-semibold text-[#3E1F00] mb-2">Assets</h3>
                      <div className="rounded-md border">
                        <Table>
                          <TableBody>
                            {(balanceSheet as any).assets?.map((item: any) => (
                              <TableRow key={item.accountId}>
                                <TableCell className="text-sm">{item.accountCode} — {item.accountName}</TableCell>
                                <TableCell className="text-right font-mono text-sm">{formatAED(item.balance)}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-blue-50 font-bold">
                              <TableCell>Total Assets</TableCell>
                              <TableCell className="text-right font-mono text-blue-700">{formatAED((balanceSheet as any).totalAssets)}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    {/* Liabilities + Equity */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-[#3E1F00] mb-2">Liabilities</h3>
                        <div className="rounded-md border">
                          <Table>
                            <TableBody>
                              {(balanceSheet as any).liabilities?.map((item: any) => (
                                <TableRow key={item.accountId}>
                                  <TableCell className="text-sm">{item.accountCode} — {item.accountName}</TableCell>
                                  <TableCell className="text-right font-mono text-sm">{formatAED(item.balance)}</TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="bg-red-50 font-bold">
                                <TableCell>Total Liabilities</TableCell>
                                <TableCell className="text-right font-mono text-red-700">{formatAED((balanceSheet as any).totalLiabilities)}</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#3E1F00] mb-2">Equity</h3>
                        <div className="rounded-md border">
                          <Table>
                            <TableBody>
                              {(balanceSheet as any).equity?.map((item: any) => (
                                <TableRow key={item.accountId}>
                                  <TableCell className="text-sm">{item.accountCode} — {item.accountName}</TableCell>
                                  <TableCell className="text-right font-mono text-sm">{formatAED(item.balance)}</TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="bg-purple-50 font-bold">
                                <TableCell>Total Equity</TableCell>
                                <TableCell className="text-right font-mono text-purple-700">{formatAED((balanceSheet as any).totalEquity)}</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>


        </Tabs>
      </div>
    </AdminLayout>
  );
}
