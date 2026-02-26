import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle, CheckCircle2, ChevronLeft, ChevronRight,
  Download, ExternalLink, Loader2, Package, RefreshCw,
  ShoppingBag, Tag, Wifi, WifiOff, XCircle
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface WooProduct {
  id: number;
  name: string;
  slug: string;
  status: string;
  price: string;
  regular_price: string;
  sale_price: string;
  stock_quantity: number | null;
  in_stock: boolean;
  images: Array<{ id: number; src: string; alt: string }>;
  categories: Array<{ id: number; name: string; slug: string }>;
  sku: string;
}

interface WooCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
  image?: { src: string } | null;
}

type Step = "connect" | "categories" | "products" | "results";

export default function WooImporter() {
  // Connection state
  const [storeUrl, setStoreUrl] = useState("");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [connected, setConnected] = useState(false);
  const [wcVersion, setWcVersion] = useState("");
  const [step, setStep] = useState<Step>("connect");

  // Categories state
  const [wooCategories, setWooCategories] = useState<WooCategory[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);

  // Products state
  const [wooProducts, setWooProducts] = useState<WooProduct[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [importImages, setImportImages] = useState(true);
  const [defaultCategoryId, setDefaultCategoryId] = useState<string>("");

  // Results state
  const [importResults, setImportResults] = useState<Array<{ id: number; name: string; status: string; error?: string }>>([]);
  const [importSummary, setImportSummary] = useState({ imported: 0, failed: 0 });

  const { data: localCategories } = trpc.categories.list.useQuery();

  const testConnection = trpc.woocommerce.testConnection.useMutation({
    onSuccess: (data) => {
      setConnected(true);
      setWcVersion(data.wcVersion || "");
      toast.success("Connected to WooCommerce!", { description: `WooCommerce v${data.wcVersion}` });
    },
    onError: (err) => {
      setConnected(false);
      toast.error("Connection failed", { description: err.message });
    },
  });

  const fetchCategories = trpc.woocommerce.fetchCategories.useMutation({
    onSuccess: (data) => {
      setWooCategories(data);
      setStep("categories");
    },
    onError: (err) => toast.error("Failed to fetch categories", { description: err.message }),
  });

  const importCategoriesMutation = trpc.woocommerce.importCategories.useMutation({
    onSuccess: (data) => {
      toast.success(`Imported ${data.imported} categories`);
      setStep("products");
      loadProducts(1);
    },
    onError: (err) => toast.error("Category import failed", { description: err.message }),
  });

  const fetchProductsMutation = trpc.woocommerce.fetchProducts.useMutation({
    onSuccess: (data) => {
      setWooProducts(data.products);
      setTotalPages(data.totalPages);
      setTotalProducts(data.totalProducts);
      setCurrentPage(data.currentPage);
    },
    onError: (err) => toast.error("Failed to fetch products", { description: err.message }),
  });

  const importProductsMutation = trpc.woocommerce.importProducts.useMutation({
    onSuccess: (data) => {
      setImportResults(data.results);
      setImportSummary({ imported: data.imported, failed: data.failed });
      setStep("results");
      toast.success(`Import complete: ${data.imported} imported, ${data.failed} failed`);
    },
    onError: (err) => toast.error("Import failed", { description: err.message }),
  });

  const creds = { storeUrl, consumerKey, consumerSecret };

  const handleConnect = () => {
    if (!storeUrl || !consumerKey || !consumerSecret) {
      toast.error("Please fill in all connection fields");
      return;
    }
    testConnection.mutate(creds);
  };

  const handleFetchCategories = () => fetchCategories.mutate(creds);

  const handleImportCategories = () => {
    if (selectedCategoryIds.length === 0) {
      setStep("products");
      loadProducts(1);
      return;
    }
    importCategoriesMutation.mutate({ ...creds, categoryIds: selectedCategoryIds });
  };

  const loadProducts = (page: number) => {
    fetchProductsMutation.mutate({ ...creds, page, perPage: 20 });
  };

  const handleImportProducts = () => {
    if (selectedProductIds.length === 0) {
      toast.error("Please select at least one product to import");
      return;
    }
    if (!defaultCategoryId) {
      toast.error("Please select a default category");
      return;
    }
    importProductsMutation.mutate({
      ...creds,
      productIds: selectedProductIds,
      defaultCategoryId: Number(defaultCategoryId),
      importImages,
    });
  };

  const toggleProduct = (id: number) => {
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleCategory = (id: number) => {
    setSelectedCategoryIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllProducts = () => {
    setSelectedProductIds(wooProducts.map(p => p.id));
  };

  const deselectAllProducts = () => setSelectedProductIds([]);

  const isLoading = testConnection.isPending || fetchCategories.isPending ||
    importCategoriesMutation.isPending || fetchProductsMutation.isPending ||
    importProductsMutation.isPending;

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center">
              <Download className="h-5 w-5 text-[#C9A84C]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#3E1F00]">WooCommerce Importer</h1>
              <p className="text-sm text-muted-foreground">Import products and categories from your WordPress WooCommerce store</p>
            </div>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center gap-2 mt-4">
            {(["connect", "categories", "products", "results"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  step === s ? "bg-[#C9A84C] text-white" :
                  ["connect", "categories", "products", "results"].indexOf(step) > i ? "bg-green-100 text-green-700" :
                  "bg-gray-100 text-gray-400"
                }`}>
                  {["connect", "categories", "products", "results"].indexOf(step) > i ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                  <span className="capitalize">{s}</span>
                </div>
                {i < 3 && <ChevronRight className="h-3 w-3 text-gray-300" />}
              </div>
            ))}
          </div>
        </div>

        {/* ── Step 1: Connect ── */}
        {step === "connect" && (
          <div className="bg-white rounded-2xl border border-[#E8D5A3] p-6">
            <h2 className="text-lg font-semibold text-[#3E1F00] mb-1">Connect to WooCommerce</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Enter your WooCommerce store URL and REST API credentials. You can generate API keys in
              <strong> WooCommerce → Settings → Advanced → REST API</strong>.
            </p>

            <div className="space-y-4">
              <div>
                <Label htmlFor="storeUrl" className="text-[#3E1F00] font-medium">Store URL</Label>
                <Input
                  id="storeUrl"
                  placeholder="https://yourstore.com"
                  value={storeUrl}
                  onChange={e => setStoreUrl(e.target.value)}
                  className="mt-1 border-[#E8D5A3] focus:border-[#C9A84C]"
                />
                <p className="text-xs text-muted-foreground mt-1">The full URL of your WordPress site</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ck" className="text-[#3E1F00] font-medium">Consumer Key</Label>
                  <Input
                    id="ck"
                    placeholder="ck_xxxxxxxxxxxx"
                    value={consumerKey}
                    onChange={e => setConsumerKey(e.target.value)}
                    className="mt-1 border-[#E8D5A3] focus:border-[#C9A84C]"
                  />
                </div>
                <div>
                  <Label htmlFor="cs" className="text-[#3E1F00] font-medium">Consumer Secret</Label>
                  <Input
                    id="cs"
                    type="password"
                    placeholder="cs_xxxxxxxxxxxx"
                    value={consumerSecret}
                    onChange={e => setConsumerSecret(e.target.value)}
                    className="mt-1 border-[#E8D5A3] focus:border-[#C9A84C]"
                  />
                </div>
              </div>
            </div>

            {connected && (
              <div className="mt-4 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <Wifi className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700 font-medium">Connected to WooCommerce {wcVersion}</span>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <Button
                onClick={handleConnect}
                disabled={isLoading}
                className="bg-[#C9A84C] hover:bg-[#9A7A2E] text-white"
              >
                {testConnection.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wifi className="h-4 w-4 mr-2" />}
                Test Connection
              </Button>
              {connected && (
                <Button
                  onClick={handleFetchCategories}
                  disabled={isLoading}
                  className="bg-[#3E1F00] hover:bg-[#6B3A0F] text-white"
                >
                  {fetchCategories.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Continue to Categories →
                </Button>
              )}
            </div>

            {/* Help box */}
            <div className="mt-6 p-4 bg-[#FFF8F0] rounded-xl border border-[#E8D5A3]">
              <p className="text-xs font-semibold text-[#3E1F00] mb-2">How to get API credentials:</p>
              <ol className="text-xs text-[#3E1F00]/70 space-y-1 list-decimal list-inside">
                <li>Log in to your WordPress admin panel</li>
                <li>Go to WooCommerce → Settings → Advanced → REST API</li>
                <li>Click "Add key" and set permissions to "Read"</li>
                <li>Copy the Consumer Key and Consumer Secret</li>
              </ol>
            </div>
          </div>
        )}

        {/* ── Step 2: Categories ── */}
        {step === "categories" && (
          <div className="bg-white rounded-2xl border border-[#E8D5A3] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-[#3E1F00]">Import Categories</h2>
                <p className="text-sm text-muted-foreground">Select categories to import from WooCommerce ({wooCategories.length} found)</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStep("connect")} className="text-[#C9A84C]">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6 max-h-80 overflow-y-auto pr-1">
              {wooCategories.map(cat => (
                <div
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    selectedCategoryIds.includes(cat.id)
                      ? "border-[#C9A84C] bg-[#C9A84C]/5"
                      : "border-[#E8D5A3] hover:border-[#C9A84C]/50"
                  }`}
                >
                  <Checkbox checked={selectedCategoryIds.includes(cat.id)} className="shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#3E1F00] truncate">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">{cat.count} products</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setSelectedCategoryIds(wooCategories.map(c => c.id))}
                className="border-[#C9A84C] text-[#C9A84C]"
              >
                Select All
              </Button>
              <Button
                onClick={handleImportCategories}
                disabled={isLoading}
                className="bg-[#C9A84C] hover:bg-[#9A7A2E] text-white"
              >
                {importCategoriesMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Tag className="h-4 w-4 mr-2" />}
                {selectedCategoryIds.length > 0 ? `Import ${selectedCategoryIds.length} Categories` : "Skip & Continue"}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Products ── */}
        {step === "products" && (
          <div className="bg-white rounded-2xl border border-[#E8D5A3] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-[#3E1F00]">Select Products to Import</h2>
                <p className="text-sm text-muted-foreground">
                  {totalProducts} products found · Page {currentPage} of {totalPages}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStep("categories")} className="text-[#C9A84C]">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-[#FFF8F0] rounded-xl border border-[#E8D5A3]">
              <div>
                <Label className="text-[#3E1F00] font-medium text-sm">Default Category</Label>
                <Select value={defaultCategoryId} onValueChange={setDefaultCategoryId}>
                  <SelectTrigger className="mt-1 border-[#E8D5A3]">
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {localCategories?.map(cat => (
                      <SelectItem key={cat.id} value={String(cat.id)}>{cat.nameEn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Used when no matching category is found</p>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Checkbox
                  id="importImages"
                  checked={importImages}
                  onCheckedChange={v => setImportImages(Boolean(v))}
                />
                <div>
                  <Label htmlFor="importImages" className="text-[#3E1F00] font-medium text-sm cursor-pointer">Import Product Images</Label>
                  <p className="text-xs text-muted-foreground">Copy image URLs from WooCommerce</p>
                </div>
              </div>
            </div>

            {/* Product list */}
            {fetchProductsMutation.isPending ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">{selectedProductIds.length} selected</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={selectAllProducts} className="text-[#C9A84C] text-xs">Select All</Button>
                    <Button variant="ghost" size="sm" onClick={deselectAllProducts} className="text-muted-foreground text-xs">Deselect All</Button>
                  </div>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {wooProducts.map(product => (
                    <div
                      key={product.id}
                      onClick={() => toggleProduct(product.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        selectedProductIds.includes(product.id)
                          ? "border-[#C9A84C] bg-[#C9A84C]/5"
                          : "border-[#E8D5A3] hover:border-[#C9A84C]/50"
                      }`}
                    >
                      <Checkbox checked={selectedProductIds.includes(product.id)} className="shrink-0" />
                      {product.images?.[0] ? (
                        <img src={product.images[0].src} alt={product.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[#F5ECD7] flex items-center justify-center shrink-0">
                          <Package className="h-4 w-4 text-[#C9A84C]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#3E1F00] truncate">{product.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {product.categories?.[0] && (
                            <span className="text-xs text-muted-foreground">{product.categories[0].name}</span>
                          )}
                          {product.sku && <span className="text-xs text-muted-foreground">SKU: {product.sku}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-[#3E1F00]">
                          {product.sale_price || product.regular_price || product.price}
                        </p>
                        <Badge variant="outline" className={`text-xs ${product.in_stock ? "text-green-600 border-green-200" : "text-red-500 border-red-200"}`}>
                          {product.in_stock ? "In Stock" : "Out of Stock"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-4">
                    <Button
                      variant="outline" size="sm"
                      disabled={currentPage <= 1 || fetchProductsMutation.isPending}
                      onClick={() => loadProducts(currentPage - 1)}
                      className="border-[#E8D5A3]"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                    <Button
                      variant="outline" size="sm"
                      disabled={currentPage >= totalPages || fetchProductsMutation.isPending}
                      onClick={() => loadProducts(currentPage + 1)}
                      className="border-[#E8D5A3]"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}

            <Separator className="my-4" />
            <div className="flex gap-3">
              <Button
                onClick={handleImportProducts}
                disabled={isLoading || selectedProductIds.length === 0 || !defaultCategoryId}
                className="bg-[#C9A84C] hover:bg-[#9A7A2E] text-white"
              >
                {importProductsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ShoppingBag className="h-4 w-4 mr-2" />
                )}
                Import {selectedProductIds.length} Products
              </Button>
              <Button
                variant="outline"
                onClick={() => loadProducts(currentPage)}
                disabled={fetchProductsMutation.isPending}
                className="border-[#E8D5A3]"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Results ── */}
        {step === "results" && (
          <div className="bg-white rounded-2xl border border-[#E8D5A3] p-6">
            <h2 className="text-lg font-semibold text-[#3E1F00] mb-1">Import Complete</h2>
            <p className="text-sm text-muted-foreground mb-6">Here's a summary of your import results</p>

            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-600 shrink-0" />
                <div>
                  <p className="text-2xl font-bold text-green-700">{importSummary.imported}</p>
                  <p className="text-sm text-green-600">Successfully Imported</p>
                </div>
              </div>
              <div className={`p-4 border rounded-xl flex items-center gap-3 ${importSummary.failed > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
                <XCircle className={`h-8 w-8 shrink-0 ${importSummary.failed > 0 ? "text-red-500" : "text-gray-400"}`} />
                <div>
                  <p className={`text-2xl font-bold ${importSummary.failed > 0 ? "text-red-600" : "text-gray-500"}`}>{importSummary.failed}</p>
                  <p className={`text-sm ${importSummary.failed > 0 ? "text-red-500" : "text-gray-400"}`}>Failed</p>
                </div>
              </div>
            </div>

            {/* Detailed results */}
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1 mb-6">
              {importResults.map((r, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${
                  r.status === "imported" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                }`}>
                  {r.status === "imported" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#3E1F00] truncate">{r.name || `Product #${r.id}`}</p>
                    {r.error && <p className="text-xs text-red-500">{r.error}</p>}
                  </div>
                  <Badge variant="outline" className={`text-xs shrink-0 ${
                    r.status === "imported" ? "text-green-600 border-green-200" : "text-red-500 border-red-200"
                  }`}>
                    {r.status}
                  </Badge>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => { setStep("products"); setSelectedProductIds([]); }}
                variant="outline"
                className="border-[#C9A84C] text-[#C9A84C]"
              >
                Import More Products
              </Button>
              <Button
                onClick={() => window.location.href = "/admin/products"}
                className="bg-[#C9A84C] hover:bg-[#9A7A2E] text-white"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Products
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
