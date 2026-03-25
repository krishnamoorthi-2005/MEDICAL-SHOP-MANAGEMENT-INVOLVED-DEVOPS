import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { TrendingUp, TrendingDown, AlertTriangle, Clock, ArrowRight, Plus, Package, FileText, DollarSign, Timer, Phone, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDashboardAnalytics, getCallRequests, updateCallRequestStatus, getDeadStockReport, type CallRequest } from '@/lib/api';
import { format } from 'date-fns';

const quickActions = [
  { label: 'Process New Bill', link: '/billing', icon: Plus, primary: true },
  { label: 'Add Stock', link: '/inventory', icon: Package, primary: false },
  { label: 'View Low Stock', link: '/inventory?filter=low', icon: AlertTriangle, primary: false },
  { label: 'Generate Report', link: '/reports', icon: FileText, primary: false }
];

export default function Dashboard() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [deadStockCount, setDeadStockCount] = useState<number>(0);
  const [deadStockBatches, setDeadStockBatches] = useState<any[]>([]);
  const [showDeadStockModal, setShowDeadStockModal] = useState(false);
  const [callRequests, setCallRequests] = useState<CallRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const data = await getDashboardAnalytics();
      if (data && data.todaySummary) {
        setAnalytics(data);
      }
      
      // Fetch dead stock data from unified API so dashboard and reports match
      try {
        const ds = await getDeadStockReport();
        console.log('Dashboard dead stock API response:', ds);
        if (ds) {
          setDeadStockCount(ds.totalItems || 0); // Number of unique products
          setDeadStockBatches(ds.batches || []);
        }
      } catch (e) {
        console.error('Failed to fetch dead stock for dashboard:', e);
        setDeadStockCount(0);
        setDeadStockBatches([]);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchCallRequests = async () => {
    try {
      const requests = await getCallRequests();
      setCallRequests(requests);
    } catch (error) {
      console.error('Failed to fetch call requests:', error);
    }
  };

  const handleUpdateCallStatus = async (id: string, status: string) => {
    try {
      await updateCallRequestStatus(id, status);
      fetchCallRequests(); // Refresh the list
    } catch (error) {
      console.error('Failed to update call request:', error);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchCallRequests();

    // Listen for key business events to refresh dashboard analytics
    const handleRefresh = () => {
      fetchAnalytics();
    };

    window.addEventListener('sale-completed', handleRefresh);
    window.addEventListener('purchase-completed', handleRefresh);
    window.addEventListener('stock-adjusted', handleRefresh);

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchAnalytics();
      fetchCallRequests();
    }, 30000);

    return () => {
      window.removeEventListener('sale-completed', handleRefresh);
      window.removeEventListener('purchase-completed', handleRefresh);
      window.removeEventListener('stock-adjusted', handleRefresh);
      clearInterval(interval);
    };
  }, []);

  const summary = analytics?.todaySummary;
  const topSellingItems = analytics?.topSellingItems || [];
  const recentTransactions = analytics?.recentTransactions || [];
  const salesTrend = analytics?.salesTrend || [];
  const maxSales = Math.max(...salesTrend.map((d: any) => d.sales), 1);

  const summaryCards = [
    {
      label: 'Total Sales',
      value: loading ? '...' : `₹${summary?.totalSales?.toLocaleString() || 0}`,
      change: loading ? '-' : `${summary?.billCount || 0} bills`,
      trend: 'neutral',
      subtitle: loading ? 'Loading...' : (summary?.billCount || 0) > 0 ? `${summary?.itemsSold || 0} items sold` : 'No sales recorded today',
      actionText: (summary?.billCount || 0) === 0 ? 'Start by creating a new bill' : '',
      link: '/reports',
      icon: DollarSign,
      gradient: 'from-indigo-500 to-violet-600',
      iconBg: 'bg-white/20',
      priority: 'primary'
    },
    {
      label: 'Net Profit',
      value: loading ? '...' : `₹${(summary?.profit ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
      change: summary && summary.profit < 0 ? '⚠️ Loss' : '-',
      trend: summary && summary.profit < 0 ? 'down' : 'neutral',
      subtitle: summary && summary.profit < 0 ? 'Operating loss' : 'Profit margin tracking',
      actionText: (summary?.billCount || 0) === 0 ? 'Begin billing to see profit' : '',
      link: '/reports',
      icon: TrendingUp,
      gradient: (summary && summary.profit < 0) ? 'from-red-500 to-rose-600' : 'from-emerald-500 to-teal-600',
      iconBg: 'bg-white/20',
      priority: 'secondary'
    },
    {
      label: 'Dead Stock',
      value: loading ? '...' : `${deadStockCount}`,
      change: '-',
      trend: deadStockCount > 0 ? 'down' : 'neutral',
      subtitle: deadStockCount > 0 ? `${deadStockCount} products not sold this week` : 'No dead stock detected',
      actionText: '',
      link: '#',
      icon: AlertTriangle,
      gradient: deadStockCount > 0 ? 'from-amber-500 to-orange-600' : 'from-slate-400 to-slate-500',
      iconBg: 'bg-white/20',
      priority: 'tertiary',
      onClick: () => setShowDeadStockModal(true)
    },
    {
      label: 'Expiring Soon',
      value: loading ? '...' : `${analytics?.expiringSoonCount || 0}`,
      change: '-',
      trend: 'neutral',
      subtitle: 'Items in next 30 days',
      actionText: '',
      link: '/inventory',
      icon: Timer,
      gradient: (analytics?.expiringSoonCount || 0) > 0 ? 'from-red-500 to-rose-600' : 'from-slate-400 to-slate-500',
      iconBg: 'bg-white/20',
      priority: 'tertiary'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Real-time overview of your pharmacy operations</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {summaryCards.map((card, index) => {
          const cardContent = (
            <div className={`relative overflow-hidden rounded-2xl p-6 cursor-pointer transition-all duration-200 hover:-translate-y-1.5 hover:shadow-2xl bg-gradient-to-br ${card.gradient}`}
              style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
              {/* Background orb */}
              <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full opacity-20"
                style={{ background: 'rgba(255,255,255,0.3)' }} />
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-white/70">{card.label}</div>
                  <div className="p-2 rounded-xl bg-white/20">
                    <card.icon className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-white tracking-tight mb-2">{card.value}</div>
                <div className="text-xs font-medium text-white/70">{card.subtitle}</div>
                {card.actionText && (
                  <div className="text-xs font-semibold text-white/80 mt-1">{card.actionText}</div>
                )}
              </div>
            </div>
          );

          return (
            <div key={index}>
              {card.onClick ? (
                <div onClick={card.onClick}>{cardContent}</div>
              ) : (
                <Link to={card.link}>{cardContent}</Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Chart */}
        <Card className="col-span-1 lg:col-span-2 border border-border/50 shadow-md transition-all duration-160 hover:shadow-xl hover:-translate-y-0.5">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
            <CardTitle className="text-base font-bold tracking-tight text-foreground/95">Sales Trend</CardTitle>
            <span className="text-xs text-muted-foreground/70 font-semibold">Last 7 Days</span>
          </CardHeader>
          <CardContent>
            {salesTrend.length > 0 && maxSales > 0 ? (
              <div className="space-y-3 py-4">
                {salesTrend.map((day: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="text-xs font-medium text-muted-foreground w-16">
                      {format(new Date(day.date), 'EEE')}
                    </div>
                    <div className="flex-1 bg-muted rounded-full h-8 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full flex items-center justify-end pr-3 text-xs font-bold text-white transition-all duration-500"
                        style={{ width: `${(day.sales / maxSales) * 100}%` }}
                      >
                        {day.sales > 0 && `₹${day.sales.toLocaleString()}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-60 items-center justify-center flex-col text-center border-2 border-dashed rounded-lg border-muted/60">
                <div className="rounded-full bg-muted/50 p-3 mb-3">
                  <TrendingUp className="h-6 w-6 text-muted-foreground/60" />
                </div>
                <h3 className="font-bold text-foreground/90 mb-1">No sales recorded yet</h3>
                <p className="text-sm text-muted-foreground/70">Process your first bill to see trends</p>
                <Button size="sm" variant="outline" asChild className="mt-4">
                  <Link to="/billing">
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Create New Bill
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Selling Items */}
        <Card className="border border-border/50 shadow-md transition-all duration-160 hover:shadow-xl hover:-translate-y-0.5">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-base font-bold tracking-tight text-foreground/95">Top Selling Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {topSellingItems.length > 0 ? (
              <div className="space-y-3 py-2">
                {topSellingItems.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.quantity} sold</div>
                    </div>
                    <div className="font-bold text-sm">₹{item.revenue.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-60 flex flex-col items-center justify-center text-center">
                <div className="rounded-full bg-muted/50 p-3 mb-3">
                  <Package className="h-6 w-6 text-muted-foreground/60" />
                </div>
                <h3 className="text-sm font-bold text-foreground/90 mb-1">No items sold yet</h3>
                <p className="text-xs text-muted-foreground/70">Sales data will appear after billing</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <Card className="col-span-1 lg:col-span-2 border border-border/50 shadow-md transition-all duration-160 hover:shadow-xl hover:-translate-y-0.5">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
            <CardTitle className="text-base font-bold tracking-tight text-foreground/95">Recent Transactions</CardTitle>
            <Button variant="link" size="sm" asChild className="text-muted-foreground/70">
              <Link to="/reports">
                View All <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentTransactions.length > 0 ? (
              <div className="space-y-2">
                {recentTransactions.map((txn: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                    <div>
                      <div className="font-medium text-sm">{txn.invoiceNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(txn.createdAt), 'MMM dd, hh:mm a')} · {txn.items} items
                      </div>
                    </div>
                    <div className="font-bold">₹{txn.total.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center border-2 border-dashed rounded-lg border-muted/60">
                <div className="flex flex-col items-center">
                  <div className="rounded-full bg-muted/50 p-3 mb-3">
                    <FileText className="h-5 w-5 text-muted-foreground/60" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground/90 mb-1">No transactions yet</h3>
                  <p className="text-xs text-muted-foreground/70">Transaction history will appear here</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Call Requests */}
        <Card className="border border-border/50 shadow-md transition-all duration-160 hover:shadow-xl hover:-translate-y-0.5">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-base font-bold tracking-tight text-foreground/95 flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Call Requests
              {callRequests.filter(req => req.status === 'pending').length > 0 && (
                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                  {callRequests.filter(req => req.status === 'pending').length} new
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {callRequests.length === 0 ? (
              <div className="text-center py-4">
                <MessageCircle className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">No call requests yet</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {callRequests.slice(0, 5).map((request) => (
                  <div key={request.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{request.name}</p>
                        <p className="text-xs text-gray-500">{request.phone}</p>
                        <p className="text-xs text-gray-400">
                          {format(new Date(request.createdAt), 'MMM dd, yyyy at h:mm a')}
                        </p>
                      </div>
                      <span className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        request.status === 'pending' && "bg-yellow-100 text-yellow-800",
                        request.status === 'called' && "bg-blue-100 text-blue-800",
                        request.status === 'resolved' && "bg-green-100 text-green-800"
                      )}>
                        {request.status}
                      </span>
                    </div>
                    {request.message && (
                      <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                        {request.message}
                      </p>
                    )}
                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleUpdateCallStatus(request.id, 'called')}
                          className="text-xs"
                        >
                          Mark Called
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleUpdateCallStatus(request.id, 'resolved')}
                          className="text-xs"
                        >
                          Mark Resolved
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border border-border/50 shadow-md transition-all duration-160 hover:shadow-xl hover:-translate-y-0.5">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-base font-bold tracking-tight text-foreground/95">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {quickActions.map((action, i) => (
              <Button
                key={i}
                variant={action.primary ? "default" : "outline"}
                className={cn(
                  "w-full justify-start gap-3 h-11 transition-all duration-160 font-medium active:scale-[0.98]",
                  action.primary && "shadow-md hover:shadow-lg",
                  !action.primary && "hover:bg-muted/50 hover:border-border hover:shadow-sm"
                )}
                asChild
              >
                <Link to={action.link}>
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Dead Stock Modal */}
      <Dialog open={showDeadStockModal} onOpenChange={setShowDeadStockModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dead Stock Items</DialogTitle>
            <DialogDescription>
              Products that haven't sold in the past week
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {deadStockBatches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No dead stock detected</p>
              </div>
            ) : (
              <div className="space-y-3">
                {deadStockBatches.map((batch, index) => (
                  <div key={index} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-base">{batch.medicineName}</h3>
                        <p className="text-sm text-muted-foreground">
                          Batch: {batch.batchNumber} | {batch.supplierName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-lg">₹{batch.totalValue?.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{batch.quantity} units</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-muted-foreground mt-3 pt-3 border-t">
                      <div>
                        <span className="font-medium">Expiry:</span>
                        <p>{batch.expiryDate ? format(new Date(batch.expiryDate), 'dd MMM yyyy') : 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-medium">Last Sold:</span>
                        <p>{batch.lastSoldDate ? format(new Date(batch.lastSoldDate), 'dd MMM yyyy') : 'Never'}</p>
                      </div>
                      <div>
                        <span className="font-medium">Days Unsold:</span>
                        <p>{batch.daysUnsold || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-medium">Location:</span>
                        <p>{batch.rackLocation || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowDeadStockModal(false)}>
              Close
            </Button>
            <Button asChild>
              <Link to="/reports/dead-stock">View Full Report</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
