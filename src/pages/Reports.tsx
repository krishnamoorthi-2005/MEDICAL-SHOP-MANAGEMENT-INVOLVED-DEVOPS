import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, DollarSign, PackageX, AlertTriangle, Download, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { getReportsAnalytics, resetExpiryLoss, generateTestData } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

type ReportData = {
  range: { start: string; end: string };
  totals: { totalSales: number; netProfit: number; billCount: number; itemsSold: number };
  dailySales: Array<{ date: string; sales: number; profit: number; bills: number; itemsSold: number }>;
  paymentModes: Array<{ mode: string; count: number; total: number }>;
  topSellingItems: Array<{ name: string; quantity: number; revenue: number }>;
  recentInvoices: Array<{ invoiceNumber: string; total: number; paymentMethod?: string; items: number; createdAt: string }>;
  expiryLoss: number;
  expiredItemCount: number;
  deadStockValue?: number;
  deadStockItems?: number;
};

const PIE_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#6b7280'];
const STANDARD_PAYMENT_MODES = ['cash', 'upi', 'card'] as const;

export default function Reports() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState('7days');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatingTestData, setGeneratingTestData] = useState(false);

  const handleGenerateTestData = async () => {
    try {
      setGeneratingTestData(true);
      await generateTestData();
      toast({
        title: 'Test Data Generated',
        description: 'Sample sales data has been created. Refreshing reports...',
        variant: 'default'
      });
      // Refresh the reports after generating test data
      const data = await getReportsAnalytics({ range: dateRange as any });
      setReport(data);
    } catch (e: any) {
      console.error('Failed to generate test data:', e);
      toast({
        title: 'Error',
        description: e?.message || 'Failed to generate test data',
        variant: 'destructive'
      });
    } finally {
      setGeneratingTestData(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getReportsAnalytics({ range: dateRange as any });
        setReport(data);
      } catch (e: any) {
        console.error('Failed to load reports analytics:', e);
        setReport(null);
        const errorMsg = e?.message || 'Failed to load reports. Please try again.';
        setError(errorMsg);
        toast({
          title: 'Error Loading Reports',
          description: errorMsg,
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    run();

    const handleRefresh = () => {
      run();
    };

    window.addEventListener('sale-completed', handleRefresh);
    window.addEventListener('purchase-completed', handleRefresh);
    window.addEventListener('stock-adjusted', handleRefresh);

    return () => {
      window.removeEventListener('sale-completed', handleRefresh);
      window.removeEventListener('purchase-completed', handleRefresh);
      window.removeEventListener('stock-adjusted', handleRefresh);
    };
  }, [dateRange]);

  const handleResetExpiryLoss = async () => {
    if (!window.confirm('Reset all recorded expiry loss? This will clear expiry loss analytics but will not change stock.')) {
      return;
    }

    try {
      await resetExpiryLoss();
      toast({ title: 'Expiry Loss Reset', description: 'Expiry loss analytics have been reset.' });

      // Trigger a global refresh so Reports/Dashboard re-read from the ledger
      window.dispatchEvent(new CustomEvent('stock-adjusted'));
    } catch (error: any) {
      console.error('Failed to reset expiry loss:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset expiry loss',
        variant: 'destructive',
      });
    }
  };

  const totals = report?.totals;
  const totalSales = totals?.totalSales || 0;
  const netProfit = totals?.netProfit || 0;
  const deadStockItems = report?.deadStockItems || 0;
  const expiryLoss = report?.expiryLoss || 0;
  const expiredItemCount = report?.expiredItemCount || 0;

  // Ensure arrays are always arrays, never undefined
  const paymentModesFromApi = report?.paymentModes ? (Array.isArray(report.paymentModes) ? report.paymentModes : []) : [];
  const dailySalesData = report?.dailySales ? (Array.isArray(report.dailySales) ? report.dailySales : []) : [];
  const topSellingItemsData = report?.topSellingItems ? (Array.isArray(report.topSellingItems) ? report.topSellingItems : []) : [];
  const recentInvoicesData = report?.recentInvoices ? (Array.isArray(report.recentInvoices) ? report.recentInvoices : []) : [];

  const paymentModes = [
    ...STANDARD_PAYMENT_MODES.map((mode) => {
      const match = paymentModesFromApi.find((item) => (item.mode || '').toLowerCase() === mode);
      return match || { mode, count: 0, total: 0 };
    }),
    ...paymentModesFromApi.filter((item) => !STANDARD_PAYMENT_MODES.includes((item.mode || '').toLowerCase() as any)),
  ];

  const paymentModeChart = paymentModes.map((p) => ({ name: p.mode?.toUpperCase?.() || 'Unknown', value: p.total || 0, count: p.count || 0 }));

  const filteredInvoices = useMemo(() => {
    const invoices = recentInvoicesData;
    if (!selectedPaymentMode) return invoices;
    return invoices.filter((i) => (i.paymentMethod || '').toLowerCase() === selectedPaymentMode.toLowerCase());
  }, [recentInvoicesData, selectedPaymentMode]);

  const exportInvoicesCsv = () => {
    if (!report) return;
    const rows = [
      ['invoiceNumber', 'date', 'total', 'paymentMethod', 'items'],
      ...filteredInvoices.map((i) => [
        i.invoiceNumber || '',
        i.createdAt ? format(new Date(i.createdAt), 'yyyy-MM-dd HH:mm') : '',
        String(i.total ?? 0),
        String(i.paymentMethod ?? ''),
        String(i.items ?? 0)
      ])
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports-invoices-${report.range.start}-to-${report.range.end}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Business intelligence and analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          {!report && !loading && (
            <Button variant="secondary" size="sm" onClick={handleGenerateTestData} disabled={generatingTestData}>
              <Zap className="mr-2 h-4 w-4" />
              {generatingTestData ? 'Generating...' : 'Generate Test Data'}
            </Button>
          )}
          <Button variant="outline" disabled>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-destructive">Failed to Load Reports</p>
              <p className="text-sm text-destructive/80 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Select value={selectedPaymentMode || 'all'} onValueChange={(v) => setSelectedPaymentMode(v === 'all' ? null : v)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All payment modes</SelectItem>
            {paymentModes.map((p) => (
              <SelectItem key={p.mode || 'unknown'} value={p.mode || 'unknown'}>{(p.mode || 'Unknown').toUpperCase()} ({p.count || 0})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportInvoicesCsv} disabled={loading || !report || filteredInvoices.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Total Sales', value: loading ? '…' : `₹${totalSales.toLocaleString()}`, icon: TrendingUp, gradient: 'from-indigo-500 to-violet-600', onClick: undefined },
          { label: 'Net Profit', value: loading ? '…' : `₹${netProfit.toLocaleString()}`, icon: DollarSign, gradient: 'from-emerald-500 to-teal-600', onClick: undefined },
          { label: 'Dead Stock', value: loading ? '…' : String(deadStockItems), sub: 'items unsold 7+ days', icon: PackageX, gradient: deadStockItems > 0 ? 'from-amber-500 to-orange-600' : 'from-slate-400 to-slate-500', onClick: () => navigate('/reports/dead-stock') },
          { label: 'Expiry Loss', value: loading ? '…' : `₹${expiryLoss.toLocaleString()}`, sub: !loading && report ? `${report.expiredItemCount} items expired` : undefined, icon: AlertTriangle, gradient: expiryLoss > 0 ? 'from-red-500 to-rose-600' : 'from-slate-400 to-slate-500', onClick: () => navigate('/reports/expiry-loss'), extra: true },
        ].map((card, i) => (
          <div key={i}
            className={`relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br ${card.gradient} text-white transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl ${card.onClick ? 'cursor-pointer' : ''}`}
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}
            onClick={card.onClick}>
            <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white/10" />
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">{card.label}</p>
                <div className="p-2 rounded-xl bg-white/20">
                  <card.icon className="h-4 w-4 text-white" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-white tracking-tight mb-1">{card.value}</p>
              {card.sub && <p className="text-xs text-white/70 font-medium">{card.sub}</p>}
              {card.extra && (
                <button
                  className="mt-3 px-3 py-1 rounded-lg text-xs font-bold bg-white/20 hover:bg-white/30 transition-colors"
                  onClick={(e) => { e.stopPropagation(); handleResetExpiryLoss(); }}>
                  Reset
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <Card className="col-span-1 lg:col-span-2 micro-interaction">
          <CardHeader>
            <CardTitle className="text-base">Sales Trend</CardTitle>
            <CardDescription>
              Daily sales over the selected period
              {!loading && report && (
                <span className="ml-2 text-xs">
                  ({format(new Date(report.range.start), 'dd MMM')} - {format(new Date(report.range.end), 'dd MMM yyyy')})
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading || !report ? (
              <div className="h-72 flex items-center justify-center flex-col border-2 border-dashed rounded-lg border-muted">
                <p className="text-muted-foreground font-medium">Loading sales data…</p>
              </div>
            ) : dailySalesData.length === 0 ? (
              <div className="h-72 flex items-center justify-center flex-col border-2 border-dashed rounded-lg border-muted">
                <p className="text-muted-foreground font-medium">No sales data recorded yet</p>
                <p className="text-xs text-muted-foreground">Transactions will appear here once you start billing</p>
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailySalesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(v) => format(new Date(v), 'dd MMM')}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(v) => format(new Date(String(v)), 'dd MMM yyyy')} 
                      formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, 'Sales']} 
                    />
                    <Line type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Mode Pie */}
        <Card className="micro-interaction">
          <CardHeader>
            <CardTitle className="text-base">Payment Mode</CardTitle>
            <CardDescription>Distribution by payment type</CardDescription>
          </CardHeader>
          <CardContent>
            {loading || !report ? (
              <div className="h-48 flex items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-lg border-muted mb-4">
                Loading…
              </div>
            ) : paymentModeChart.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-lg border-muted mb-4">
                No payment data
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={paymentModeChart} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
                        {paymentModeChart.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: any) => `₹${Number(v).toLocaleString()}`}
                        labelFormatter={(label: any) => String(label)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Always show available payment modes (even if 0) */}
                <div className="space-y-2">
                  {paymentModes.map((p, idx) => (
                    <div key={p.mode || `payment-${idx}`} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                        <span className="font-medium">{(p.mode || 'Unknown').toUpperCase()}</span>
                        <span className="text-muted-foreground">({p.count || 0})</span>
                      </div>
                      <div className="font-semibold">₹{(p.total || 0).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Selling & Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Selling Items */}
        <Card className="micro-interaction">
          <CardHeader>
            <CardTitle className="text-base">Top Selling Items</CardTitle>
            <CardDescription>By quantity sold</CardDescription>
          </CardHeader>
          <CardContent>
            {loading || !report ? (
              <div className="h-64 flex items-center justify-center flex-col text-muted-foreground border-2 border-dashed rounded-lg border-muted">
                <p>Loading…</p>
              </div>
            ) : topSellingItemsData.length === 0 ? (
              <div className="h-64 flex items-center justify-center flex-col text-muted-foreground border-2 border-dashed rounded-lg border-muted">
                <p>No items sold</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topSellingItemsData.slice(0, 8).map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.name || 'Unknown Item'}</div>
                      <div className="text-xs text-muted-foreground">{item.quantity || 0} sold</div>
                    </div>
                    <div className="font-bold text-sm">₹{(item.revenue || 0).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card className="col-span-1 lg:col-span-2 micro-interaction">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Invoices</CardTitle>
              <CardDescription>All transactions</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {loading || !report ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">Loading…</div>
            ) : filteredInvoices.length === 0 ? (
              <div className="h-64 flex items-center justify-center flex-col text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Download className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">No invoices found</h3>
                <p className="text-muted-foreground mb-4">Try changing the date range or payment mode filter.</p>
                <Button asChild>
                  <a href="/billing">Go to Billing</a>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead className="text-center">Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.slice(0, 15).map((inv) => (
                    <TableRow key={inv.invoiceNumber || Math.random()}>
                      <TableCell className="font-medium">{inv.invoiceNumber || '-'}</TableCell>
                      <TableCell>{inv.createdAt ? format(new Date(inv.createdAt), 'dd MMM yyyy, HH:mm') : '-'}</TableCell>
                      <TableCell>{(inv.paymentMethod || '-').toUpperCase()}</TableCell>
                      <TableCell className="text-center">{inv.items || 0}</TableCell>
                      <TableCell className="text-right font-semibold">₹{(inv.total || 0).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
