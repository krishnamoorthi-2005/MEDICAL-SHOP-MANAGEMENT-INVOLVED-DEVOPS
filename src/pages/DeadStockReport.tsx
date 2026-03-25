import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, PackageX } from 'lucide-react';
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
  getDeadStockReport,
  DeadStockItem,
  getDemandPrediction,
  type DemandPredictionItem,
  downloadDemandPredictionCsv,
} from '@/lib/api';

export default function DeadStockReport() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<DeadStockItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictions, setPredictions] = useState<DemandPredictionItem[]>([]);
  const [predictionMetadata, setPredictionMetadata] = useState<any>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [csvDownloading, setCsvDownloading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await getDeadStockReport();
        setItems(data.batches || []);
        setTotalItems(data.totalItems || 0);
      } catch (e) {
        console.error('Failed to load dead stock report', e);
        setItems([]);
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleRunPrediction = async () => {
    try {
      setPredictionLoading(true);
      setPredictionError(null);
      const result = await getDemandPrediction();
      setPredictions(result.data || []);
      setPredictionMetadata(result.metadata || null);
    } catch (e: any) {
      console.error('Failed to fetch prediction', e);
      setPredictions([]);
      setPredictionMetadata(null);
      setPredictionError(e?.message || 'Failed to fetch prediction');
    } finally {
      setPredictionLoading(false);
    }
  };

  const handleDownloadCsv = async () => {
    try {
      setCsvDownloading(true);
      const blob = await downloadDemandPredictionCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'purchase_predictions.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to download prediction CSV', e);
    } finally {
      setCsvDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <PackageX className="h-6 w-6 text-slate-500" />
              Dead Stock Report
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Batches with stock on hand but no sales in the last 7 days
            </p>
          </div>
        </div>
        <div className="text-right p-4 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-sm">
          <div className="text-xs text-slate-300 font-medium">Total Dead Stock Items</div>
          <div className="text-2xl font-bold">{totalItems.toLocaleString()}</div>
        </div>
      </div>

      {/* AI Purchase Recommendations */}
      <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border/40 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-foreground">AI Purchase Recommendations</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Trained on real sales from the stock ledger to forecast next month demand per medicine.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleDownloadCsv} disabled={csvDownloading}>
              <Download className="h-4 w-4 mr-1" />
              {csvDownloading ? 'Downloading…' : 'Download CSV'}
            </Button>
            <Button size="sm" onClick={handleRunPrediction} disabled={predictionLoading} style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }} className="text-white">
              {predictionLoading ? 'Running…' : 'Run Prediction'}
            </Button>
          </div>
        </div>
        <div className="p-6">
          {predictionError && (
            <p className="text-xs text-red-500 mb-4">{predictionError}</p>
          )}
          {predictions.length > 0 ? (
            <div className="overflow-auto max-h-[50vh] rounded-xl border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Medicine</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                      {predictionMetadata?.monthName && predictionMetadata?.previousYear
                        ? `${predictionMetadata.monthName} ${predictionMetadata.previousYear} Sales`
                        : 'Previous Year Sales'}
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Current Stock</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Recommended Purchase</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {predictions.map((p) => (
                    <TableRow key={p.medicineId} className="hover:bg-slate-50/60">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{p.medicineName || 'Unknown'}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">{p.medicineId}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{(p.previousSales || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium">{p.currentStock.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold text-indigo-600">{p.recommendedPurchase.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-xs">
                        {typeof p.confidence === 'number' ? `${Math.round(p.confidence * 100)}%` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <p className="text-sm">Click "Run Prediction" to generate AI-based purchase recommendations per medicine.</p>
            </div>
          )}
        </div>
      </div>

      {/* Dead Stock Batches */}
      <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border/40 bg-slate-50/50">
          <h2 className="font-semibold text-foreground">Dead Stock Batches</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {loading
              ? 'Loading dead stock details…'
              : items.length === 0
              ? 'No dead stock batches found'
              : `${items.length} batch${items.length === 1 ? '' : 'es'} currently considered dead stock`}
          </p>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="h-72 flex items-center justify-center flex-col border-2 border-dashed rounded-xl border-muted">
              <p className="text-muted-foreground font-medium">Loading…</p>
            </div>
          ) : items.length === 0 ? (
            <div className="h-72 flex items-center justify-center flex-col border-2 border-dashed rounded-xl border-muted">
              <p className="text-muted-foreground font-medium">No dead stock currently detected</p>
              <p className="text-xs text-muted-foreground mt-1">Batches will appear here once they remain unsold for 90+ days.</p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[70vh] rounded-xl border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    {['Medicine', 'Batch', 'Expiry', 'Qty Remaining', 'Purchase Price', 'Total Value', 'Last Sold', 'Days Unsold', 'Supplier', 'Rack'].map(h => (
                      <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const expiry = item.expiryDate ? new Date(item.expiryDate) : null;
                    const lastSold = item.lastSoldDate ? new Date(item.lastSoldDate) : null;
                    return (
                      <TableRow key={item.batchId} className="hover:bg-slate-50/60">
                        <TableCell className="font-medium">{item.medicineName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.batchNumber}</TableCell>
                        <TableCell className="text-sm">{expiry ? expiry.toLocaleDateString() : '-'}</TableCell>
                        <TableCell className="text-sm font-semibold">{item.quantity}</TableCell>
                        <TableCell className="text-sm">₹{item.purchasePrice.toFixed(2)}</TableCell>
                        <TableCell className="text-sm font-semibold text-slate-700">₹{item.totalValue.toFixed(2)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{lastSold ? lastSold.toLocaleDateString() : 'Never Sold'}</TableCell>
                        <TableCell className="text-sm">
                          {typeof item.daysUnsold === 'number' ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{item.daysUnsold} days</Badge>
                          ) : 'Never Sold'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.supplierName || '-'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.rackLocation || '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
